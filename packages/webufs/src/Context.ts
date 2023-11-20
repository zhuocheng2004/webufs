
import { Dentry, Mount } from "./fs"
import { LookupInfo, LookupType, VFS } from "./VFS"

/**
 * The context to use VFS.
 * It keeps tracks of pwd etc., like a progress on Linux.
 */
class Context {
    vfs: VFS
    root: Dentry
    rootMnt: Mount | null = null
    pwd: Dentry
    pwnMnt: Mount | null = null

    constructor(vfs: VFS) {
        this.vfs = vfs
        this.root = Dentry.getRoot()
        this.pwd = Dentry.getRoot()
    }

    private async lookup(path: string, lookupType: LookupType): Promise<LookupInfo> {
        if (!this.rootMnt || !this.pwnMnt) {
            throw Error('no fs mounted')
        }

        if (path.length === 0) return new LookupInfo(this.pwd, this.pwnMnt)

        let start: LookupInfo
        if (path.charAt(0) === '/') {
            start = new LookupInfo(this.root, this.rootMnt)
        } else {
            start = new LookupInfo(this.pwd, this.pwnMnt)
        }

        return this.vfs.pathLookup(path, start, lookupType)
    }

    async chdir(path: string): Promise<void> {
        try {
            let result = await this.lookup(path, LookupType.NORMAL)
            this.pwd = result.dentry
            this.pwnMnt = result.mount
        } catch (error) {
            throw Error(`Cannot chdir to ${path}: ${error}`)
        }
    }

    async chroot(path: string): Promise<void> {
        try {
            let result = await this.lookup(path, LookupType.NORMAL)
            this.root = result.dentry
            this.rootMnt = result.mount
        } catch (error) {
            throw Error(`Cannot chroot to ${path}: ${error}`)
        }
    }

    private async mountInternal(fsName: string, dentry: Dentry): Promise<Mount> {
        let fsType = this.vfs.getFSType(fsName)
        return await fsType.mount(dentry)
    }

    async mountInit(fsName: string): Promise<void> {
        this.rootMnt = await this.mountInternal(fsName, this.root)
        this.pwnMnt = await this.mountInternal(fsName, this.pwd)
    }

    async mount(fsName: string, path: string): Promise<void> {
        let info = await this.lookup(path, LookupType.NORMAL)
        await this.mountInternal(fsName, info.dentry)
    }

    async mkdir(path: string): Promise<void> {
        try {
            let result = await this.lookup(path, LookupType.EXCEPT_LAST)
            if (result.dentry.inode) {
                throw Error(`file exists`)
            }
            let dentry = result.dentry
            dentry.parent.children.push(dentry)
        } catch (error) {
            throw Error(`Cannot mkdir${path}: ${error}`)
        }
    }
}

export { Context }
