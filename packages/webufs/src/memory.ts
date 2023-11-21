
/**
 * In-memory file system implementation
 * name: "memfs"
 * 
 * also a toy example
 */

import { Dentry, FileSystemType, Inode, InodeOperations, InodeType, Mount, SuperOperations } from "./fs"
import { simpleCreaate, simpleRmdir } from "./common"

function mkInode(type: InodeType): Inode {
    switch (type) {
        case InodeType.REG | InodeType.DIR:
            return new Inode(type, memFSInodeOperations, null)
        default:
            throw Error('unsupported inode type')
    }
}

const memFSInodeOperations: InodeOperations = {
    create: simpleCreaate,
    link: function (dir: Dentry, old_dentry: Dentry, new_dentry: Dentry): Promise<void> {
        throw new Error("Function not implemented.")
    },
    unlink: function (dentry: Dentry): Promise<void> {
        throw new Error("Function not implemented.")
    },
    symlink: function (dir: Dentry, dentry: Dentry, sym: string): Promise<void> {
        throw new Error("Function not implemented.")
    },
    mkdir: async function (dentry: Dentry): Promise<void> {
        dentry.inode = mkInode(InodeType.DIR)
    },
    rmdir: simpleRmdir,
    mknod: function (dir: Inode, dentry: Dentry, dev: any): Promise<void> {
        throw new Error("Function not implemented.")
    },
    rename: function (old_dir: Inode, old_dentry: Dentry, new_dir: Inode, new_dentry: Dentry): Promise<void> {
        throw new Error("Function not implemented.")
    },
    getLink: function (dir: Dentry, inode: Inode): Promise<string> {
        throw new Error("Function not implemented.")
    }
}

const memFSSuperOperations: SuperOperations = {
    mkInode: async function (type: InodeType): Promise<Inode> {
        return mkInode(type)
    }
}

/**
 * In-memory fs type
 */
class InMemoryFSType extends FileSystemType {
    constructor() {
        super("memfs")
    }

    async mount(dentry: Dentry): Promise<Mount> {
        return new Mount(dentry, memFSSuperOperations)
    }
}

/**
 * An in-memory fs type instance
 */
const InMemoryFS = new InMemoryFSType()

export {
    InMemoryFSType,
    InMemoryFS
}

