
import { Dentry, FileSystemType, InodeType, KStat } from "./fs"

/**
 * used in path_lookup
 */
export enum LookupType {
    /** require destination file exists */
    NORMAL,
    /** doesn't require the destination file exists (but require intermediate dirs), used when creating files */
    EXCEPT_LAST,
}

/**
 * a VFS instance which has a registry of file system types
 */
export class VFS {
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
        throw Error(`file system type "${name}" not found`)
    }

    /**
     * Lookup a dir/file given a path string
     * @param path the path to look up
     * @param start the dir to start look up
     * @param root the relative root dir. We should never go to the parent of this dir.
     * @param lookupType the type for lookup
     * @returns the found dentry
     */
    async pathLookup(path: string, start: Dentry, root: Dentry, lookupType: LookupType): Promise<Dentry> {
        let components = path.split('/')
        components = components.filter(s => s.length > 0)

        let curDir = start
        for (let i = 0; i < components.length; i++) {
            let component = components[i]
            let found: Dentry | null = null

            // deal with special cases: '.' and '..'
            if (component === '.') {
                continue
            } else if (component === '..') {
                if (curDir !== root) curDir = curDir.parent
                continue
            }

            if (!curDir.inode) {
                throw Error('negative dentry')
            }
 
            found = await curDir.inode.inode_op.lookup(curDir, component)
            
            if (!found) {
                if (lookupType === LookupType.EXCEPT_LAST && i === components.length-1) {
                    // create a new dentry
                    let dentry = new Dentry(component, curDir.mount)
                    dentry.parent = curDir
                    return dentry
                }
                throw Error('path lookup: file doesn\'t exist')
            } else {
                if (!found.inode) {
                    throw Error('negative inode')
                }
                if (i !== components.length-1) {
                    // non-last component needs to be a dir
                    if (found.inode.type !== InodeType.DIR) {
                        throw Error('not a directory')
                    }
                }
                curDir = found
            }
        }

        return curDir
    }
}
