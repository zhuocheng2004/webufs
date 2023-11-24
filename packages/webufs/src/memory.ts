
/**
 * In-memory file system implementation
 * name: "memfs"
 * 
 * also a toy example
 */

import { Dentry, FileOperations, FileSystemType, Inode, InodeOperations, InodeType, Mount, SuperOperations, VFile } from "./fs"
import { simpleCreaate, simpleLookup, simpleRmdir } from "./common"
import { ResizableBuffer } from "./ResizableBuffer"

class MemFSInode extends Inode {
    data?: ResizableBuffer

    constructor(type: InodeType, inode_op: InodeOperations, file_op?: FileOperations) {
        super(type, inode_op, file_op)
    }
}

class MemFSFile extends VFile {
    pos: number = 0

    constructor(inode: MemFSInode) {
        super(inode)
    }
}

class NotMemFSError extends Error {
    constructor(msg?: string) {
        super(`not memfs object`)
    }
}

function getAsMemFSInode(inode: Inode): MemFSInode {
    if (!(inode instanceof MemFSFile)) {
        throw new NotMemFSError()
    }
    return inode
}

function getAsMemFSFile(file: VFile): MemFSFile {
    if (!(file instanceof MemFSFile)) {
        throw new NotMemFSError()
    }
    return file
}


function mkInode(type: InodeType): Inode {
    switch (type) {
        case InodeType.REG:
            return new MemFSInode(InodeType.REG, memFSInodeOperations, memFSFileOperations)
        case InodeType.DIR:
            return new MemFSInode(InodeType.DIR, memFSInodeOperations, undefined)
        default:
            throw Error(`memfs: unsupported inode type: ${type}`)
    }
}

const memFSInodeOperations: InodeOperations = {
    lookup: simpleLookup,
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

const memFSFileOperations: FileOperations = {
    llseek: function (file: VFile, offset: number, rel: number): Promise<void> {
        throw new Error("Function not implemented.")
    },
    read: async function (file: VFile, dst: ArrayBuffer, offset: number, size: number): Promise<void> {
        let inode = getAsMemFSInode(file.inode)
        if (!inode.data) {
            throw Error('negative inode')
        }
        inode.data.read(offset, size, dst)
    },
    write: async function (file: VFile, src: ArrayBuffer, offset: number, size: number): Promise<void> {
        let inode = getAsMemFSInode(file.inode)
        if (!inode.data) {
            throw Error('negative inode')
        }
        inode.data.write(offset, size, src)
    },
    open: async function (file: VFile): Promise<VFile> {
        let inode = getAsMemFSInode(file.inode)
        if (!inode.data) {
            inode.data = new ResizableBuffer()
        }
        return new MemFSFile(inode)
    },
    flush: function (): Promise<void> {
        throw new Error("Function not implemented.")
    },
    release: function (): Promise<void> {
        throw new Error("Function not implemented.")
    },
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

