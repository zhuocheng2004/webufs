
import { Dentry, FileOperations, Inode, InodeType, VFile } from "./fs"
import { LookupType, VFS } from "./VFS"

export type OpenFlag = {
    /**
     * Create regular file if not exist.
     */
    create ?: boolean

    /**
     * Used together with CREATE. Throw error when file exists
     */
    excl ?: boolean
}

export class FileDescriptor {
    file: VFile
    op: FileOperations

    constructor(file: VFile) {
        this.file = file
        if (!file.inode.file_op) {
            throw Error('cannot create FileDescriptor: file operations unavailable')
        }
        this.op = file.inode.file_op
    }

    async read(dst: ArrayBuffer, offset: number) {
        await this.op.read(this.file, dst, offset, dst.byteLength)
    }

    async write(src: ArrayBuffer, offset: number) {
        await this.op.write(this.file, src, offset, src.byteLength)
    }
}

/**
 * The context to use VFS.
 * It keeps tracks of pwd etc.
 */
export class Context {
    vfs: VFS
    root: Dentry
    pwd: Dentry

    constructor(vfs: VFS) {
        this.vfs = vfs
        // pwd and root should refer to the same denty, so you cannot use two lines of code.
        this.pwd = this.root = Dentry.getRoot()
    }

    /**
     * Lookup dir/file with respect to pwd/root
     * @param path path to look up
     * @param lookupType type of lookup
     * @returns the found dentry
     */
    private async lookup(path: string, lookupType: LookupType): Promise<Dentry> {
        if (path.length === 0) return this.pwd

        let start = path.charAt(0) === '/' ? this.root : this.pwd

        return await this.vfs.pathLookup(path, start, this.root, lookupType)
    }

    /**
     * change the current working dir to a new dir
     * @param path new dir
     */
    async chdir(path: string): Promise<void> {
        try {
            let dentry = await this.lookup(path, LookupType.NORMAL)
            if (!dentry.inode || dentry.inode.type !== InodeType.DIR) throw Error('not a directory')
            this.pwd = dentry
        } catch (error) {
            throw Error(`Cannot chdir to ${path}: ${error}`)
        }
    }

    /**
     * change the root dir to a new dir (probably for future container design?)
     * @param path new root dir
     */
    async chroot(path: string): Promise<void> {
        try {
            let dentry = await this.lookup(path, LookupType.NORMAL)
            if (!dentry.inode || dentry.inode.type !== InodeType.DIR) throw Error('not a directory')
            this.root = dentry
        } catch (error) {
            throw Error(`Cannot chroot to ${path}: ${error}`)
        }
    }

    /**
     * only used when mounting the first fs
     * @param fsName the first fs
     */
    async mountInit(fsName: string): Promise<void> {
        let fsType = this.vfs.getFSType(fsName)
        this.root.mount = await fsType.mount(this.root)
        this.root.inode = await this.root.mount.op.mkInode(InodeType.DIR)
        this.pwd.mount = await fsType.mount(this.pwd)
        this.pwd.inode = await this.pwd.mount.op.mkInode(InodeType.DIR)
    }

    /**
     * Mount an fs at a dir
     * @param fsName name of fs to mount
     * @param path mount point
     */
    async mount(fsName: string, path: string) {
        let fsType = this.vfs.getFSType(fsName)
        let dentry = await this.lookup(path, LookupType.NORMAL)
        // the dentry must be an empty dir
        if (!dentry.inode || dentry.inode.type !== InodeType.DIR) throw Error('not a directory')
        if (!dentry.isEmpty()) throw Error('directory not empty')
        await fsType.mount(dentry)
    }

    /**
     * get a current working directory as a string
     * @returns the pwd
     */
    getcwd(): string {
        if (this.pwd === this.root) return '/'
        let path = ''
        for (let curDir = this.pwd; curDir !== this.root; curDir = curDir.parent) {
            path = '/' + curDir.name + path
        }
        return path
    }

    /**
     * Make a directory
     * @param path directory path
     */
    async mkdir(path: string) {
        try {
            let dentry = await this.lookup(path, LookupType.EXCEPT_LAST)
            if (dentry.inode) {
                throw Error(`file exists`)
            }
            if (!dentry.mount) {
                throw Error('negative dentry')
            }
            dentry.inode = await dentry.mount.op.mkInode(InodeType.DIR)

            dentry.parent.children.push(dentry)
        } catch (error) {
            throw Error(`cannot mkdir ${path}: ${error}`)
        }
    }

    /**
     * Remove an existing directory.
     * 
     * @param path directory path
     */
    async rmdir(path: string) {
        try {
            let dentry = await this.lookup(path, LookupType.NORMAL)
            if (dentry.inode) {
                dentry.inode.inode_op.rmdir(dentry)
            } else {
                dentry.parent.remove(dentry)
            }
        } catch (error) {
            throw Error(`cannot rmdir ${path}: ${error}`)
        }
    }

    async open(path: string, flags: OpenFlag): Promise<FileDescriptor> {
        try {
            let dentry = await this.lookup(path, LookupType.EXCEPT_LAST)
            if (!dentry.mount) {
                throw Error('negative dentry')
            }

            let inode: Inode
            if (dentry.inode) {     // positive dentry: file exist
                if (flags.create && flags.excl) {
                    throw Error('file exists')
                }
                inode = dentry.inode
            } else {                // negative dentry: file doesn't exist
                if (!flags.create) {
                    throw Error('file does not exist')
                }
                inode = await dentry.mount.op.mkInode(InodeType.REG)
                await inode.inode_op.create(inode, dentry)
            }

            if (!inode.file_op) {
                throw Error('file operations not available')
            }

            let file = new VFile(inode)
            await inode.file_op.open(file)

            return new FileDescriptor(file)
        } catch (error) {
            throw Error(`cannot open ${path}: ${error}`)
        }
    }
}
