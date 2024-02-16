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
} from '@webufs/webufs'

function appendErrorMsg(msg?: string) {
    return msg ? ': ' + msg : ''
}

class IDBFSError extends Error {
    constructor(msg?: string) {
        super('idbfs error' + appendErrorMsg(msg))
    }
}

class IDBFSTypeError extends IDBFSError {
    constructor(msg?: string) {
        super('not idbfs object' + appendErrorMsg(msg))
    }
}

class IDBFSDBError extends IDBFSError {
    constructor(msg?: string) {
        super('indexeddb' + appendErrorMsg(msg))
    }
}

class IDBFSNoDBError extends IDBFSDBError {
    constructor() {
        super('no database')
    }
}

enum IDBFSInodeType {
    REG = 0,
    DIR = 1,
    LNK = 2,
}

function toTypeCode(type: InodeType): IDBFSInodeType {
    switch (type) {
        case InodeType.REG:
            return IDBFSInodeType.REG
        case InodeType.DIR:
            return IDBFSInodeType.DIR
        case InodeType.SYMLINK:
            return IDBFSInodeType.LNK
        default:
            throw new IDBFSError('not supported inode type')
    }
}

function fromTypeCode(code: IDBFSInodeType): InodeType {
    switch (code) {
        case IDBFSInodeType.REG:
            return InodeType.REG
        case IDBFSInodeType.DIR:
            return InodeType.DIR
        case IDBFSInodeType.LNK:
            return InodeType.SYMLINK
        default:
            throw new IDBFSError('unrecognized type code')
    }
}

type IDBFSInodeItem = {
    ino: number
    type: number
    links: number
    data: Map<string, number> | ArrayBuffer
}

async function getItemFromDB(db: IDBDatabase, ino: number): Promise<IDBFSInodeItem> {
    return await new Promise<IDBFSInodeItem>((resolve, reject) => {
        const request = db.transaction('inodes', 'readonly').objectStore('inodes').get(ino)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        request.onerror = (event) => reject(new IDBFSDBError(`cannot get from objectStore "inodes" with ino=${ino} `))

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        request.onsuccess = (event) => {
            resolve(request.result as IDBFSInodeItem)
        }
    })
}

class IDBFSInode extends Inode {
    /** dir entries if dir */
    entries?: Map<string, number>

    constructor(type: InodeType, file_op?: FileOperations) {
        super(type, idbFSInodeOperations, file_op)
    }

    getData() {
        switch (this.type) {
            case InodeType.DIR:
                if (this.entries === undefined) {
                    return new Map()
                }
                // make a copy
                return new Map(this.entries)
            case InodeType.REG:
                break
            default:
                throw new IDBFSError('not supported inode type')
        }
    }

    /**
     * Update inode info according to key inode.ino
     */
    async updateInfo() {
        if (!this.dentry || !this.dentry.mount) throw new IDBFSError('flying inode')
        const mount = this.dentry.mount as IDBFSMount
        const db = mount.getDB()
        if (!db) throw new IDBFSNoDBError()

        const item = await getItemFromDB(db, this.ino)

        this.type = fromTypeCode(item.type)
        this.nlink = item.links

        if (item.type === IDBFSInodeType.DIR) {
            this.entries = new Map(item.data as Map<string, number>)
            this.dentry.children = []
            this.size = this.entries.size
        }
    }

    /**
     * This will create sub-dir abstract inode objects
     */
    async updateChilden() {
        if (!this.dentry || !this.dentry.mount) throw new IDBFSError('flying inode')
        const mount = this.dentry.mount as IDBFSMount
        const db = mount.getDB()
        if (!db) throw new IDBFSNoDBError()

        const item = await getItemFromDB(db, this.ino)

        if (item.type !== IDBFSInodeType.DIR) throw new IDBFSError('not directory')

        this.entries = new Map(item.data as Map<string, number>)
        this.dentry.children = []
        for (const entry of this.entries) {
            const childIno = entry[1]
            const childName = entry[0]
            const childItem = await getItemFromDB(db, childIno)
            const childInode = mkInode(fromTypeCode(childItem.type))
            childInode.ino = childIno
            const subDentry = new Dentry(childName, this.dentry.mount)
            subDentry.inode = childInode
            subDentry.parent = this.dentry
            childInode.dentry = subDentry
            await childInode.updateInfo()
            this.dentry.children.push(subDentry)
        }
        this.size = this.dentry.children.length
    }

    /**
     * create corresponding entry in database
     */
    async addToDB() {
        if (!this.dentry || !this.dentry.mount) throw new IDBFSError('flying inode')
        const mount = this.dentry.mount as IDBFSMount
        const db = mount.getDB()
        if (!db) throw new IDBFSNoDBError()
        await new Promise<void>((resolve, reject) => {
            const request = db
                .transaction('inodes', 'readwrite')
                .objectStore('inodes')
                .add({
                    type: toTypeCode(this.type),
                    links: this.nlink,
                    data: this.getData(),
                })
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            request.onerror = (event) => reject(new IDBFSDBError(`cannot add to objectStore "inodes"`))
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            request.onsuccess = (event) => resolve()
        })

        // Get the new key
        await new Promise<void>((resolve, reject) => {
            const request = db.transaction('inodes', 'readonly').objectStore('inodes').getAllKeys()
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            request.onerror = (event) => reject(new IDBFSDBError('getAllKeys() failed'))
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            request.onsuccess = (event) => {
                const keys = request.result as number[]
                if (keys.length <= 0) throw new IDBFSDBError('getAllKeys() got none')
                this.ino = Math.max(...keys)
                resolve()
            }
        })

        await this.updateInfo()
    }

    /**
     * update data of corresponding entry in database
     */
    async putToDB() {
        if (!this.dentry || !this.dentry.mount) throw new IDBFSError('flying inode')
        const mount = this.dentry.mount as IDBFSMount
        const db = mount.getDB()
        if (!db) throw new IDBFSNoDBError()
        await new Promise<void>((resolve, reject) => {
            const request = db
                .transaction('inodes', 'readwrite')
                .objectStore('inodes')
                .put({
                    ino: this.ino,
                    type: toTypeCode(this.type),
                    links: this.nlink,
                    data: this.getData(),
                })
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            request.onerror = (event) => reject(new IDBFSDBError(`cannot put to objectStore "inodes"`))
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            request.onsuccess = (event) => resolve()
        })
        await this.updateInfo()
    }

    /**
     * remove information from database
     */
    async drop() {
        if (!this.dentry || !this.dentry.mount) throw new IDBFSError('flying inode')
        const mount = this.dentry.mount as IDBFSMount
        const db = mount.getDB()
        if (!db) throw new IDBFSNoDBError()
        await new Promise<void>((resolve, reject) => {
            const request = db.transaction('inodes', 'readwrite').objectStore('inodes').delete(this.ino)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            request.onerror = (event) => reject(new IDBFSDBError(`cannot put to objectStore "inodes"`))
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            request.onsuccess = (event) => resolve()
        })
    }

    async get() {
        await this.updateInfo()
        this.nlink++
        await this.putToDB()
    }

    async put() {
        await this.updateInfo()
        this.nlink--
        if (this.nlink <= 0) {
            this.dentry?.mount?.op.dropInode(this)
        } else {
            await this.putToDB()
        }
    }
}

class IDBFSFile extends VFile {
    pos: number = 0

    constructor(inode: IDBFSInode) {
        super(inode)
    }
}

function getAsIDBFSInode(inode: Inode): IDBFSInode {
    if (!(inode instanceof IDBFSInode)) {
        throw new IDBFSTypeError()
    }
    return inode
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getAsIDBFSFile(file: VFile): IDBFSFile {
    if (!(file instanceof IDBFSFile)) {
        throw new IDBFSTypeError()
    }
    return file
}

function mkInode(type: InodeType): IDBFSInode {
    let inode: IDBFSInode
    switch (type) {
        case InodeType.REG:
            inode = new IDBFSInode(InodeType.REG, idbFSFileOperations)
            break
        case InodeType.DIR:
            inode = new IDBFSInode(InodeType.DIR, idbFSDirFileOperations)
            inode.entries = new Map()
            break
        default:
            throw new IDBFSError('unsupported inode type: ' + type)
    }
    return inode
}

const idbFSInodeOperations: InodeOperations = {
    lookup: async function (base: Dentry, childName: string): Promise<Dentry | null> {
        if (!base.inode) throw new IDBFSError('negative dentry')
        const inode = base.inode as IDBFSInode

        // This will create subdir inode objects
        await inode.updateInfo()
        if (inode.type !== InodeType.DIR) throw new IDBFSError('not directory')
        await inode.updateChilden()

        for (const subdir of base.children) {
            if (subdir.name === childName) {
                return subdir
            }
        }
        return null
    },
    create: async function (inode: Inode, dentry: Dentry): Promise<void> {
        if (!dentry.parent.inode) throw new IDBFSError('negative parent dentry')
        if (dentry.parent.inode.type !== InodeType.DIR) throw new IDBFSError('parent not directory')
        inode.dentry = dentry
        dentry.inode = inode
        const child = getAsIDBFSInode(inode)
        await child.addToDB()
        await child.get()
        const parent = getAsIDBFSInode(dentry.parent.inode)
        if (!parent.entries) throw new IDBFSError('broken directory inode')
        parent.entries.set(inode.dentry.name, child.ino)
        await parent.putToDB()
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    link: function (dir: Dentry, old_dentry: Dentry, new_dentry: Dentry): Promise<void> {
        throw new IDBFSError('Function not implemented.')
    },
    unlink: async function (dentry: Dentry): Promise<void> {
        if (!dentry.inode) throw Error('negative dentry')
        const inode = dentry.inode as IDBFSInode
        await inode.updateInfo()

        // remove from parent name-inode map
        const parent = dentry.parent.inode as IDBFSInode
        await parent.updateInfo()
        await parent.updateChilden()
        parent.entries?.delete(dentry.name)
        await parent.putToDB()

        await inode.put()
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    symlink: function (dir: Dentry, dentry: Dentry, sym: string): Promise<void> {
        throw new IDBFSError('Function not implemented.')
    },
    mkdir: async function (dentry: Dentry): Promise<void> {
        if (!dentry.inode) throw new IDBFSError('negative dentry')
        if (dentry.inode.type !== InodeType.DIR) throw new IDBFSError('inode type not dir')
        await this.create(dentry.inode, dentry)
    },
    rmdir: async function (dentry: Dentry): Promise<void> {
        if (!dentry.inode) throw Error('negative dentry')
        const inode = dentry.inode as IDBFSInode
        await inode.updateInfo()
        if (inode.type !== InodeType.DIR) throw new Error('not a directory')
        if (inode.size > 0) throw new Error('directory not empty')

        await this.unlink(dentry)
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mknod: function (dir: Inode, dentry: Dentry, dev: unknown): Promise<void> {
        throw new IDBFSError('Function not implemented.')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rename: function (old_dir: Inode, old_dentry: Dentry, new_dir: Inode, new_dentry: Dentry): Promise<void> {
        throw new IDBFSError('Function not implemented.')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getLink: function (dir: Dentry, inode: Inode): Promise<string> {
        throw new IDBFSError('Function not implemented.')
    },
}

const idbFSFileOperations: FileOperations = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    llseek: function (file: VFile, offset: number, rel: SeekType): Promise<void> {
        throw new IDBFSError('Function not implemented.')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    read: function (file: VFile, dst: ArrayBuffer, size: number): Promise<void> {
        throw new IDBFSError('Function not implemented.')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    write: function (file: VFile, src: ArrayBuffer, size: number): Promise<void> {
        throw new IDBFSError('Function not implemented.')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    iterate: function (file: VFile, callback: IterateCallback): Promise<void> {
        throw new IDBFSError('Function not implemented.')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    open: function (file: VFile): Promise<VFile> {
        throw new IDBFSError('Function not implemented.')
    },
    flush: async function (): Promise<void> {},
    release: async function (): Promise<void> {},
}

const idbFSDirFileOperations: FileOperations = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    llseek: function (file: VFile, offset: number, rel: SeekType): Promise<void> {
        throw new IDBFSError('Function not implemented.')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    read: function (file: VFile, dst: ArrayBuffer, size: number): Promise<void> {
        throw new IDBFSError('Function not implemented.')
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    write: function (file: VFile, src: ArrayBuffer, size: number): Promise<void> {
        throw new IDBFSError('Function not implemented.')
    },
    iterate: async function (file: VFile, callback: IterateCallback): Promise<void> {
        if (file.inode.type !== InodeType.DIR) {
            throw new IDBFSError('only directories can be iterated')
        }
        if (!file.inode.dentry) {
            throw new IDBFSError('only files on directory tree can be iterated')
        }
        await (file.inode as IDBFSInode).updateChilden()
        const dentry = file.inode.dentry
        for (const subdir of dentry.children) {
            await callback(subdir.name)
        }
    },
    open: async function (file: VFile): Promise<VFile> {
        const inode = getAsIDBFSInode(file.inode)
        await inode.updateInfo()
        return new IDBFSFile(inode)
    },
    flush: async function (): Promise<void> {},
    release: async function (): Promise<void> {},
}

const idbFSSuperOperations: SuperOperations = {
    mkInode: async function (type: InodeType): Promise<Inode> {
        return mkInode(type)
    },
    mkVFile: async function (inode: Inode): Promise<VFile> {
        const ino = getAsIDBFSInode(inode)
        return new IDBFSFile(ino)
    },
    dropInode: async function (inode: Inode): Promise<void> {
        // remove from database
        await (inode as IDBFSInode).drop()
    },
}

class IDBFSMount extends Mount {
    /** indexedDB backend */
    private indexedDB: IDBFactory

    /** name of the database */
    private dbName: string

    /** indexedDB object */
    private db?: IDBDatabase

    constructor(indexedDB: IDBFactory, mntPoint: Dentry, dbName: string) {
        super(mntPoint, idbFSSuperOperations)
        this.indexedDB = indexedDB
        this.dbName = dbName
    }

    getDB() {
        return this.db
    }

    async doMount(): Promise<void> {
        this.db = await new Promise((resolve, reject) => {
            const request = this.indexedDB.open(this.dbName)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            request.onerror = (event) => reject(new IDBFSDBError(`cannot open database "${this.dbName}"`))

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            request.onupgradeneeded = (event) => {
                const db = request.result

                const inodeStore = db.createObjectStore('inodes', {
                    keyPath: 'ino',
                    autoIncrement: true,
                })

                // ROOT dir entry
                inodeStore.add({
                    ino: 0,
                    type: IDBFSInodeType.DIR,
                    links: 1,
                    data: new Map(),
                })
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            request.onsuccess = (event) => {
                console.debug(`idbfs mounted with database "${this.dbName}"`)
                resolve(request.result)
            }
        })

        this.mntPoint.mount = this
        /** This relies on the statement above */
        this.mntPoint.inode = await this.getRoot()
    }

    async getRoot(): Promise<IDBFSInode> {
        const inode = mkInode(InodeType.DIR)
        inode.dentry = this.mntPoint
        inode.ino = 0
        await inode.updateInfo()
        return inode
    }
}

type MountFlag = {
    /** indexedDB backend */
    indexedDB?: IDBFactory

    /** name of database */
    dbName?: string
}

export class IDBFSType extends FileSystemType {
    constructor() {
        super('idbfs')
    }

    async mount(dentry: Dentry, options?: MountFlag): Promise<Mount> {
        const indexedDB = options && options.indexedDB ? options.indexedDB : window.indexedDB
        const dbName = options && options.dbName ? options.dbName : 'webufs-idb'
        const mount = new IDBFSMount(indexedDB, dentry, dbName)
        await mount.doMount()
        return mount
    }
}

/**
 * An in-memory fs type instance
 */
export const IDBFS = new IDBFSType()
