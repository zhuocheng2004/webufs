import { Dentry, FileOperations, Inode, InodeType, SeekType, StatConst, VFile } from './fs'
import { LookupType, VFS } from './VFS'

/**
 * Flag object when openning a file/dir
 */
export type OpenFlag = {
    /**
     * Create regular file if not exist.
     */
    create?: boolean

    /**
     * Used together with CREATE. Throw error when file exists
     */
    excl?: boolean

    /**
     * only read, no writing (not implemented yet)
     */
    rdonly?: boolean

    /**
     * We are going to open a directory
     */
    directory?: boolean
}

/**
 * The type code used in @see DirEntry
 */
export enum DirEntryType {
    DT_BLK,
    DT_CHR,
    DT_DIR, // directory
    DT_FIFO,
    DT_LNK, // symbolic link
    DT_REG, // regular file
    DT_SOCK,
    DT_UNKNOWN,
}

/**
 * Result type of @see FileDescriptor.getdents
 */
export class DirEntry {
    name: string
    type: DirEntryType

    constructor(name: string, type: DirEntryType) {
        this.name = name
        this.type = type
    }
}

/**
 * Information of a file
 */
export class Stat {
    /** inode number */
    ino: number

    /** file mode */
    mode: number

    /** file size */
    size: number

    constructor(ino: number, mode: number, size: number) {
        this.ino = ino
        this.mode = mode
        this.size = size
    }
}

/**
 * A file descriptor is the handle for an opened file.
 */
export class FileDescriptor {
    private file: VFile
    private op: FileOperations

    constructor(file: VFile) {
        this.file = file
        if (!file.inode.file_op) {
            throw new Error('cannot create file descriptor without file operations')
        }
        this.op = file.inode.file_op
    }

    /**
     * Close an opened file.
     * This will flush all pending operations and release resources.
     */
    async close() {
        await this.op.flush()
        await this.op.release()
        await this.file.inode.put()
    }

    /**
     * Seek read/write relative position
     * @param offset seek offset
     * @param rel seek type
     */
    async seek(offset: number, rel: SeekType) {
        await this.op.llseek(this.file, offset, rel)
    }

    /**
     * Read some bytes from a file to a buffer
     * @param dst buffer to write to
     * @param size number of bytes to read (default to be the target buffer size)
     */
    async read(dst: ArrayBuffer, size?: number) {
        if (!size) size = dst.byteLength
        await this.readInternal(dst, size)
    }

    /**
     * Write some bytes from a buffer to a file
     * @param src buffer that provides data
     * @param size number of bytes to write (default to be the source buffer size)
     */
    async write(src: ArrayBuffer, size?: number) {
        if (!size) size = src.byteLength
        await this.writeInternal(src, size)
    }

    private async readInternal(dst: ArrayBuffer, size: number) {
        await this.op.read(this.file, dst, size)
    }

    private async writeInternal(src: ArrayBuffer, size: number) {
        await this.op.write(this.file, src, size)
    }

    /**
     * get dir entries inside a dir
     * @returns an array of entries
     */
    async getdents(): Promise<Array<DirEntry>> {
        if (!this.file.inode.dentry) {
            throw Error('flying inode')
        }
        const base = this.file.inode.dentry

        const list = new Array<DirEntry>()
        await this.op.iterate(this.file, async (name) => {
            const dentry = await this.file.inode.inode_op.lookup(base, name)
            if (dentry && dentry.inode) {
                let type: DirEntryType
                switch (dentry.inode.type) {
                    case InodeType.DIR:
                        type = DirEntryType.DT_DIR
                        break
                    case InodeType.REG:
                        type = DirEntryType.DT_REG
                        break
                    case InodeType.SYMLINK:
                        type = DirEntryType.DT_LNK
                        break
                    default:
                        type = DirEntryType.DT_UNKNOWN
                }
                const dirent = new DirEntry(name, type)
                list.push(dirent)
            } else {
                console.warn('iterate() provided non-exist file or negative dentry')
            }
        })
        return list
    }
}

/**
 * The context to use VFS.
 * It keeps tracks of pwd etc.
 */
export class Context {
    private vfs: VFS
    private root: Dentry
    private pwd: Dentry

    constructor(vfs: VFS) {
        this.vfs = vfs
        // pwd and root should refer to the same denty, so you cannot use two lines of code.
        this.pwd = this.root = Dentry.getRoot()
    }

    getVFS(): VFS {
        return this.vfs
    }

    /**
     * Lookup dir/file with respect to pwd/root
     * @param path path to look up
     * @param lookupType type of lookup
     * @returns the found dentry
     */
    private async lookup(path: string, lookupType: LookupType): Promise<Dentry> {
        if (path.length === 0) return this.pwd

        const start = path.charAt(0) === '/' ? this.root : this.pwd

        return await this.vfs.pathLookup(path, start, this.root, lookupType)
    }

    /**
     * change the current working dir to a new dir
     * @param path new dir
     */
    async chdir(path: string): Promise<void> {
        try {
            const dentry = await this.lookup(path, LookupType.NORMAL)
            if (!dentry.inode || dentry.inode.type !== InodeType.DIR) throw Error('not a directory')
            this.pwd = dentry
        } catch (error) {
            throw Error(`cannot chdir to "${path}": ${error}`)
        }
    }

    /**
     * change the root dir to a new dir (probably for future container design?)
     * @param path new root dir
     */
    async chroot(path: string): Promise<void> {
        try {
            const dentry = await this.lookup(path, LookupType.NORMAL)
            if (!dentry.inode || dentry.inode.type !== InodeType.DIR) throw Error('not a directory')
            this.root = dentry
        } catch (error) {
            throw Error(`cannot chroot to "${path}": ${error}`)
        }
    }

    /**
     * only used when mounting the first fs
     * @param fsName the first fs
     */
    async mountInit(fsName: string, options?: object): Promise<void> {
        const fsType = this.vfs.getFSType(fsName)
        this.pwd.mount = this.root.mount = await fsType.mount(this.root, options)
        this.pwd.inode = this.root.inode = await this.root.mount.op.mkInode(InodeType.DIR)
    }

    /**
     * Mount an fs at a dir
     * @param fsName name of fs to mount
     * @param path mount point
     * @param options additional options
     */
    async mount(fsName: string, path: string, options?: object) {
        const fsType = this.vfs.getFSType(fsName)
        const dentry = await this.lookup(path, LookupType.NORMAL)
        // the dentry must be an empty dir
        if (!dentry.inode || dentry.inode.type !== InodeType.DIR) throw Error('not a directory')
        if (!dentry.isEmpty()) throw Error('directory not empty')
        await fsType.mount(dentry, options)
    }

    /**
     * get the current working directory as a string
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
            const dentry = await this.lookup(path, LookupType.EXCEPT_LAST)
            if (dentry.inode) {
                throw Error('file exists')
            }
            if (!dentry.mount) {
                throw Error('negative dentry')
            }
            const inode = await dentry.mount.op.mkInode(InodeType.DIR)
            dentry.inode = inode
            await inode.inode_op.mkdir(dentry)
        } catch (error) {
            throw Error(`cannot mkdir "${path}": ${error}`)
        }
    }

    /**
     * Remove an existing directory.
     * The directory should be empty.
     *
     * @param path directory path
     */
    async rmdir(path: string) {
        try {
            const dentry = await this.lookup(path, LookupType.NORMAL)
            if (dentry.inode) {
                if (dentry.mount !== dentry.parent.mount) throw Error('cannot remove mount point, please umount first')
                await dentry.inode.inode_op.rmdir(dentry)
            } else {
                dentry.parent.remove(dentry)
                throw Error('not found')
            }
        } catch (error) {
            throw Error(`cannot rmdir "${path}": ${error}`)
        }
    }

    /**
     * Open a file/directory
     * @param path path to the file
     * @param flags open flag.
     * @returns
     */
    async open(path: string, flags?: OpenFlag): Promise<FileDescriptor> {
        //console.log(`open: ${path} with flags ${flags}`)

        if (!flags) flags = {}

        try {
            const dentry = await this.lookup(path, LookupType.EXCEPT_LAST)
            if (!dentry.mount) {
                throw Error('negative dentry')
            }

            let inode: Inode
            if (dentry.inode) {
                // positive dentry: file exist
                if (flags.create && flags.excl) {
                    throw Error('file exists')
                }
                inode = dentry.inode
            } else {
                // negative dentry: file doesn't exist
                if (!flags.create) {
                    throw Error('file does not exist')
                }
                if (flags.directory) {
                    inode = await dentry.mount.op.mkInode(InodeType.DIR)
                } else {
                    inode = await dentry.mount.op.mkInode(InodeType.REG)
                }
                await inode.inode_op.create(inode, dentry)
            }

            inode.dentry = dentry

            const file = await dentry.mount.op.mkVFile(inode)

            if (!flags.directory) {
                if (!inode.file_op) {
                    throw Error('file operations not available')
                }

                await inode.file_op.open(file)
            }

            await inode.get()

            return new FileDescriptor(file)
        } catch (error) {
            throw Error(`cannot open "${path}": ${error}`)
        }
    }

    /**
     * Unlink a file.
     * Cannot unlink directory.
     */
    async unlink(path: string) {
        try {
            const dentry = await this.lookup(path, LookupType.NORMAL)
            if (dentry.inode) {
                if (dentry.inode.type === InodeType.DIR) throw Error('is directory')
                await dentry.inode.inode_op.unlink(dentry)
            } else {
                throw Error('not found')
            }
        } catch (error) {
            throw Error(`cannot unlink "${path}": ${error}`)
        }
    }

    /**
     * Get information about a file
     * @param filename filename
     * @returns
     */
    async stat(filename: string): Promise<Stat> {
        try {
            const dentry = await this.lookup(filename, LookupType.NORMAL)
            if (!dentry.inode) throw Error('negative dentry')
            const inode = dentry.inode
            let mode = 0
            switch (inode.type) {
                case InodeType.SYMLINK:
                    mode |= StatConst.IFLNK
                    break
                case InodeType.REG:
                    mode |= StatConst.IFREG
                    break
                case InodeType.DIR:
                    mode |= StatConst.IFDIR
                    break
            }

            return new Stat(0, mode, inode.size)
        } catch (error) {
            throw Error(`cannot stat "${filename}": ${error}`)
        }
    }
}
