/**
 * In-memory file system implementation
 * name: "memfs"
 *
 * also a toy example
 */

import {
    Dentry,
    FileOperations,
    FileSystemType,
    Inode,
    InodeOperations,
    InodeType,
    IterateCallback,
    Mount,
    SeekType,
    SuperOperations,
    VFile,
} from './fs'
import { genericDropInode, simpleCreate, simpleLookup, simpleMkdir, simpleRmdir, simpleUnlink } from './common'
import { ResizableBuffer } from './ResizableBuffer'

class MemFSInode extends Inode {
    data?: ResizableBuffer
    readonly: boolean

    constructor(type: InodeType, readonly: boolean, file_op?: FileOperations) {
        super(type, memFSInodeOperations, file_op)
        this.readonly = readonly
    }

    updateSize(): boolean {
        if (this.data) {
            this.size = this.data.limit
            return true
        } else {
            return false
        }
    }
}

class MemFSFile extends VFile {
    pos: number = 0

    constructor(inode: MemFSInode) {
        super(inode, inode.readonly)
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
        super('not memfs object' + appendErrorMsg(msg))
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

function mkInode(type: InodeType): MemFSInode {
    switch (type) {
        case InodeType.REG:
            return new MemFSInode(InodeType.REG, true, memFSFileOperations)
        case InodeType.DIR:
            return new MemFSInode(InodeType.DIR, true, memFSDirFileOperations)
        default:
            throw new MemFSError('unsupported inode type: ' + type)
    }
}

const memFSInodeOperations: InodeOperations = {
    lookup: simpleLookup,
    create: simpleCreate,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    link: function (_dir: Dentry, old_dentry: Dentry, new_dentry: Dentry): Promise<void> {
        throw new MemFSError('Function not implemented.')
    },
    unlink: simpleUnlink,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    symlink: function (dir: Dentry, dentry: Dentry, sym: string): Promise<void> {
        throw new MemFSError('Function not implemented.')
    },
    mkdir: simpleMkdir,
    rmdir: simpleRmdir,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mknod: function (dir: Inode, dentry: Dentry, dev: unknown): Promise<void> {
        throw new MemFSError('Function not implemented.')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rename: function (old_dir: Inode, old_dentry: Dentry, new_dir: Inode, new_dentry: Dentry): Promise<void> {
        throw new MemFSError('Function not implemented.')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getLink: function (dir: Dentry, inode: Inode): Promise<string> {
        throw new MemFSError('Function not implemented.')
    },
}

const memFSFileOperations: FileOperations = {
    llseek: async function (file: VFile, offset: number, rel: SeekType): Promise<void> {
        const f = getAsMemFSFile(file)
        const inode = getAsMemFSInode(f.inode)
        if (!inode.data) {
            throw new MemFSError('cannot seek negative inode')
        }
        const limit = inode.data.limit
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
    read: async function (file: VFile, dst: ArrayBuffer, size: number): Promise<number> {
        const f = getAsMemFSFile(file)
        const inode = getAsMemFSInode(f.inode)
        if (!inode.data) {
            throw new MemFSError('cannot read negative inode')
        }
        const cnt = inode.data.read(f.pos, size, dst)
        f.pos += cnt
        return cnt
    },
    write: async function (file: VFile, src: ArrayBuffer, size: number): Promise<void> {
        const f = getAsMemFSFile(file)
        const inode = getAsMemFSInode(f.inode)
        if (inode.readonly) throw new MemFSError('readonly')
        if (!inode.data) throw new MemFSError('cannot write negative inode')
        inode.data.write(f.pos, size, src)
        f.pos += size
        inode.updateSize()
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    iterate: function (file: VFile, callback: IterateCallback): Promise<void> {
        throw new MemFSError('cannot iterate non-directory file')
    },
    open: async function (file: VFile): Promise<VFile> {
        const inode = getAsMemFSInode(file.inode)
        if (!inode.data) {
            inode.data = new ResizableBuffer()
        }
        inode.readonly = file.readonly
        return new MemFSFile(inode)
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    flush: async function (file: VFile): Promise<void> {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    release: async function (file: VFile): Promise<void> {},
}

const memFSDirFileOperations: FileOperations = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    llseek: function (file: VFile, offset: number, rel: SeekType): Promise<void> {
        throw new MemFSError('cannot seek dir')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    read: function (file: VFile, dst: ArrayBuffer, size: number): Promise<number> {
        throw new MemFSError('cannot read dir')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    write: function (file: VFile, src: ArrayBuffer, size: number): Promise<void> {
        throw new MemFSError('cannot write dir')
    },
    iterate: async function (file: VFile, callback: IterateCallback) {
        if (file.inode.type !== InodeType.DIR) {
            throw new MemFSError('only directories can be iterated')
        }
        if (!file.inode.dentry) {
            throw new MemFSError('only files on directory tree can be iterated')
        }
        const dentry = file.inode.dentry
        for (const subdir of dentry.children) {
            await callback(subdir.name)
        }
    },
    open: async function (file: VFile): Promise<VFile> {
        const inode = getAsMemFSInode(file.inode)
        inode.readonly = file.readonly
        return new MemFSFile(inode)
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    flush: async function (file: VFile): Promise<void> {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    release: async function (file: VFile): Promise<void> {},
}

const memFSSuperOperations: SuperOperations = {
    mkInode: async function (type: InodeType): Promise<Inode> {
        return mkInode(type)
    },

    mkVFile: async function (inode: Inode): Promise<VFile> {
        const ino = getAsMemFSInode(inode)
        return new MemFSFile(ino)
    },

    dropInode: genericDropInode,
}

/**
 * In-memory fs type
 */
export class InMemoryFSType extends FileSystemType {
    constructor() {
        super('memfs')
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async mount(dentry: Dentry, options?: object): Promise<Mount> {
        const mount = new Mount(dentry, memFSSuperOperations)
        dentry.inode = mkInode(InodeType.DIR)
        dentry.mount = mount
        return mount
    }
}

/**
 * An in-memory fs type instance
 */
export const InMemoryFS = new InMemoryFSType()
