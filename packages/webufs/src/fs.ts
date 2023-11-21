
/**
 * A dentry holds the name of a file/dir.
 */
export class Dentry {
    /**
     * name of a single dir/file
     */
    name: string

    /**
     * parent directory
     */
    parent: Dentry = this
    /**
     * sub-directories
     */
    children: Dentry[] = []

    /**
     * Associated inode, if present
     */
    inode: Inode | null = null

    /**
     * Associated mount instance, if present
     */
    mount: Mount | null = null

    constructor(name: string, mount: Mount | null) {
        this.name = name
        this.mount = mount
    }

    /**
     * create a raw root dentry
     * @returns created dentry
     */
    static getRoot(): Dentry {
        let dentry = new Dentry('/', null)
        dentry.parent = dentry
        return dentry
    }

    /**
     * add a subdir
     * @param child dentry to add as a child
     */
    add(child: Dentry) {
        this.children.push(child)
    }

    /**
     * remove a subdir
     * @param child dentry to remove
     */
    remove(child: Dentry) {
        this.children = this.children.filter(d => d !== child)
    }
}

/**
 * The type of an inode
 */
export enum InodeType {
    REG,    // regular
    DIR,    // directory
    SYMLINK // symbolic link
}

/**
 * An inode is a holder of a real file/directory.
 * Inode could be attached to a dentry, but 
 * it can also be used on its own.
 */
export class Inode {
    type: InodeType

    /**
     * inode operations
     */
    inode_op: InodeOperations

    /**
     * file operations
     */
    file_op: FileOperations | null

    constructor(type: InodeType, inode_op: InodeOperations, file_op: FileOperations | null) {
        this.type = type
        this.inode_op = inode_op
        this.file_op = file_op
    }
}

abstract class VFile {
}

/**
 * Operations on VFile object
 */
export interface FileOperations {
    llseek: (file: VFile, offset: number, rel: number) => Promise<void>
    read: (file: VFile, buffer: ArrayBuffer, offset: number) => Promise<void>
    write: (file: VFile, buffer: ArrayBuffer, offset: number) => Promise<void>
    open: (inode: Inode, file: VFile) => Promise<void>
    flush: () => Promise<void>
    release: () => Promise<void>
}

/**
 * Operations on an inode
 */
export interface InodeOperations {
    /**
     * Called when creating regular files.
     * @param inode the inode to be associated to the dentry
     * @param dentry a negative dentry where the file will be 
     * created on
     * @returns
     */
    create: (inode: Inode, dentry: Dentry) => Promise<void>

    /**
     * Called when creating hard links.
     * @param dir base dir
     * @param old_dentry the old dentry to be linked 
     * @param new_dentry the placed to create hard link
     * @returns void
     */
    link: (dir: Dentry, old_dentry: Dentry, new_dentry: Dentry) => Promise<void>

    /**
     * Called when deleting inodes.
     * @param dentry the dentry to be deleted
     * @returns void
     */
    unlink: (dentry: Dentry) => Promise<void>

    /**
     * Called when creating symbolic links.
     * @param dir: base dir
     * @param dentry the dentry to be pointed to
     * @param sym the symlink content
     * @returns 
     */
    symlink: (dir: Dentry, dentry: Dentry, sym: string) => Promise<void>

    /**
     * Called when creating a new directory.
     * @param dentry the dir name to create
     * @returns void
     */
    mkdir: (dentry: Dentry) => Promise<void>

    /**
     * Called when removing a dir.
     * @param dentry dir to delete
     * @returns void
     */
    rmdir: (dentry: Dentry) => Promise<void>

    /**
     * Called when creating a device/pipe/socket object.
     * @param dir base dir
     * @param dentry place to create
     * @param dev device id
     * @returns void
     */
    mknod: (dir: Inode, dentry: Dentry, dev: any) => Promise<void>

    /**
     * Called when renaming a file/dir
     * @param old_dir 
     * @param old_dentry 
     * @param new_dir 
     * @param new_dentry 
     * @returns 
     */
    rename: (old_dir: Inode, old_dentry: Dentry, new_dir: Inode, new_dentry: Dentry) => Promise<void>
    
    /**
     * Called when trying to read where a symbolic link points to
     * @param dir base dir
     * @param inode the inode for the symlink
     * @returns the destination
     */
    getLink: (dir: Dentry, inode: Inode) => Promise<string>
}

export interface SuperOperations {
    mkInode: (type: InodeType) => Promise<Inode>
}

/**
 * Stands for a mount instance
 */
export class Mount {
    /**
     * mount point
     */
    mntPoint: Dentry

    /**
     * global operating methods for a type of fs
     */
    op: SuperOperations

    constructor(mntPoint: Dentry, op: SuperOperations) {
        this.mntPoint = mntPoint
        this.op = op
    }
}


/**
 * A FileSystemType stands for a type of fs,
 * not an instance of fs. 
 * It implements necessary functions in order to work.
 * 
 * For example, the fs type 'idbfs' might have been mounted
 * multiple times with different args referring to 
 * different background databases. 
 */
export abstract class FileSystemType {
    /**
     * the unique identifier for an fs type
     */
    readonly name: string

    constructor(name: string) {
        this.name = name
    }

    /**
     * Called when an instance is being mounted.
     * @param dentry the dentry to mount on
     */
    abstract mount(dentry: Dentry): Promise<Mount>
}
