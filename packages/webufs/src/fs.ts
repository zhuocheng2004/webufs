
abstract class Dentry {
    /**
     * name of a single dir/file
     */
    name: string

    /**
     * sub-directories
     */
    children: Dentry[] = []

    constructor(name: string) {
        this.name = name
    }
}

abstract class Inode {
}

abstract class VFile {
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
    abstract mount(dentry: Dentry): void
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
