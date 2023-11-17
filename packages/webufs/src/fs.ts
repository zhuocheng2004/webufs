
/**
 * A dentry holds the name of a file/dir.
 */
abstract class Dentry {
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

    constructor(name: string) {
        this.name = name
    }
}

/**
 * An inode is a holder of a real file/directory.
 * Inode could be attached to a dentry, but 
 * it can also be used on its own.
 */
abstract class Inode {
    /**
     * inode operations
     */
    abstract inode_op: InodeOperations

    /**
     * file operations
     */
    abstract file_op: FileOperations
}

abstract class VFile {
}

interface FileOperations {
    llseek: () => Promise<void>
    read: () => Promise<void>
    write: () => Promise<void>
    open: () => Promise<void>
    flush: () => Promise<void>
    release: () => Promise<void>
}

interface InodeOperations {
    lookup: () => Promise<void>
    readlink: (dentry: Dentry) => Promise<string>
    create: (inode: Inode, dentry: Dentry) => Promise<void>
    link: (dentry: Dentry, inode: Inode) => Promise<void>
    unlink: (inode: Inode, dentry: Dentry) => Promise<void>
    symlink: (inode: Inode, dentry: Dentry, sym: string) => Promise<void>
    mkdir: (inode: Inode, dentry: Dentry) => Promise<void>
    rmdir: (inode: Inode, dentry: Dentry) => Promise<void>
    mknod: (inode: Inode, dentry: Dentry) => Promise<void>
    rename: () => Promise<void>
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
abstract class FileSystemType {
    /**
     * the unique identifier for an fs type
     */
    readonly name: string

    constructor(name: string) {
        this.name = name
    }

    /**
     * This defines how to mount an fs on a dentry.
     * @param dentry the dentry to mount on
     */
    abstract mount(dentry: Dentry): Promise<void>
}

class VFS {
    protected fileSystems: FileSystemType[] = []

    registerFSType(fsType: FileSystemType) {
        for (let t of this.fileSystems) {
            if (t.name === fsType.name) return
        }
        this.fileSystems.push(fsType)
    }

    unregisterFSType(fsType: FileSystemType) {
        this.fileSystems = this.fileSystems.filter(t => t.name !== fsType.name)
    }
}

export {
    Dentry, Inode,
    FileSystemType,
    VFS
}
