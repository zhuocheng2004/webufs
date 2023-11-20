
import { Dentry, FileSystemType, Mount } from "./fs"


enum LookupType {
    NORMAL,
    EXCEPT_LAST,
}

class LookupInfo {
    dentry: Dentry
    mount: Mount

    constructor(dentry: Dentry, mount: Mount) {
        this.dentry = dentry
        this.mount = mount
    }
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

    getFSType(name: string): FileSystemType {
        for (let fs of this.fileSystems) {
            if (fs.name === name) return fs
        }
        throw Error(`file system type ${name} not found`)
    }

    async pathLookup(path: string, start: LookupInfo, lookupType: LookupType): Promise<LookupInfo> {
        let components = path.split('/')
        components = components.filter(s => s.length > 0)

        let curDir = start.dentry
        let curMnt = start.mount
        for (let i = 0; i < components.length; i++) {
            let component = components[i]
            let found: Dentry | null = null
            for (let subdir of curDir.children) {
                if (subdir.name === component) {
                    found = subdir
                    break
                }
            }
            if (!found) {
                if (lookupType === LookupType.EXCEPT_LAST && i === components.length-1) {
                    let dentry = new Dentry(component)
                    dentry.parent = curDir
                    return new LookupInfo(dentry, curMnt)
                }
                throw new Error('path lookup: cannot find')
            } else {
                curDir = found
            }
        }

        return new LookupInfo(curDir, curMnt)
    }
}

export {
    LookupType, LookupInfo,
    VFS
}
