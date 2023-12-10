
/**
 * In-memory file system implementation
 * name: "memfs"
 * 
 * also a toy example
 */

import { Dentry, FileOperations, FileSystemType, Inode, InodeOperations, InodeType, IterateCallback, Mount, SeekType, SuperOperations, VFile } from "./fs"
import { simpleCreate, simpleLookup, simpleRmdir } from "./common"
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

function appendErrorMsg(msg?: string) {
    return msg ? ': ' + msg : ''
}

class MemFSError extends Error {
    constructor(msg?: string) {
        super('memfs error' + appendErrorMsg(msg))
    }
}

class MemFSTypeError extends MemFSError {
    constructor(msg?: string) {
        super('not memfs object')
    }
}

class MemFSSeekOutOfRangeError extends MemFSError {
    constructor(msg?: string) {
        super('seek out of range' + appendErrorMsg(msg))
    }
}

function getAsMemFSInode(inode: Inode): MemFSInode {
    if (!(inode instanceof MemFSInode)) {
        throw new MemFSTypeError()
    }
    return inode
}

function getAsMemFSFile(file: VFile): MemFSFile {
    if (!(file instanceof MemFSFile)) {
        throw new MemFSTypeError()
    }
    return file
}


function mkInode(type: InodeType): Inode {
    switch (type) {
        case InodeType.REG:
            return new MemFSInode(InodeType.REG, memFSInodeOperations, memFSFileOperations)
        case InodeType.DIR:
            return new MemFSInode(InodeType.DIR, memFSInodeOperations, memFSDirFileOperations)
        default:
            throw new MemFSError('unsupported inode type: ' + type)
    }
}

const memFSInodeOperations: InodeOperations = {
    lookup: simpleLookup,
    create: simpleCreate,
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
    llseek: async function (file: VFile, offset: number, rel: SeekType): Promise<void> {
        let f = getAsMemFSFile(file)
        let inode = getAsMemFSInode(f.inode)
        if (!inode.data) {
            throw new MemFSError('cannot seek negative inode')
        }
        let limit = inode.data.limit
        let newPos = 0

        switch (rel) {
            case SeekType.SET:
                newPos = offset
                break
            case SeekType.CUR:
                newPos = f.pos + offset
                break
            case SeekType.END:
                newPos = limit + offset
                break
            default:
                throw new MemFSError('invalid llseek type')
        }

        if (newPos < 0 || newPos >= limit) {
            throw new MemFSSeekOutOfRangeError()
        }

        f.pos = newPos
    },
    read: async function (file: VFile, dst: ArrayBuffer, size: number): Promise<void> {
        let f = getAsMemFSFile(file)
        let inode = getAsMemFSInode(f.inode)
        if (!inode.data) {
            throw new MemFSError('cannot read negative inode')
        }
        inode.data.read(f.pos, size, dst)
        f.pos += size
    },
    write: async function (file: VFile, src: ArrayBuffer, size: number): Promise<void> {
        let f = getAsMemFSFile(file)
        let inode = getAsMemFSInode(f.inode)
        if (!inode.data) {
            throw new MemFSError('cannot write negative inode')
        }
        inode.data.write(f.pos, size, src)
        f.pos += size
    },
    iterate: function (file: VFile, callback: IterateCallback): Promise<void> {
        throw new Error("cannot iterate non-directory file")
    },
    open: async function (file: VFile): Promise<VFile> {
        let inode = getAsMemFSInode(file.inode)
        if (!inode.data) {
            inode.data = new ResizableBuffer()
        }
        return new MemFSFile(inode)
    },
    flush: async function (): Promise<void> { },
    release: function (): Promise<void> {
        throw new Error("Function not implemented.")
    },
}

const memFSDirFileOperations: FileOperations = {
    llseek: function (file: VFile, offset: number, rel: SeekType): Promise<void> {
        throw new Error("cannot seek dir")
    },
    read: function (file: VFile, dst: ArrayBuffer, size: number): Promise<void> {
        throw new Error("cannot read dir")
    },
    write: function (file: VFile, src: ArrayBuffer, size: number): Promise<void> {
        throw new Error("cannot write dir")
    },
    iterate: async function (file: VFile, callback: IterateCallback) {
        if (file.inode.type !== InodeType.DIR) {
            throw new MemFSError('only directories can be iterated')
        }
        if (!file.inode.dentry) {
            throw new MemFSError('only files on directory tree can be iterated')
        }
        let dentry = file.inode.dentry
        for (let subdir of dentry.children) {
            await callback(subdir.name)
        }
    },
    open: async function (file: VFile): Promise<VFile> {
        let inode = getAsMemFSInode(file.inode)
        return new MemFSFile(inode)
    },
    flush: async function (): Promise<void> { },
    release: function (): Promise<void> {
        throw new Error("Function not implemented.")
    }
}

const memFSSuperOperations: SuperOperations = {
    mkInode: async function (type: InodeType): Promise<Inode> {
        return mkInode(type)
    },

    mkVFile: async function (inode: Inode): Promise<VFile> {
        let ino = getAsMemFSInode(inode)
        return new MemFSFile(ino)
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

