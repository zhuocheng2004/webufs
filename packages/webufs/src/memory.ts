
/**
 * In-memory file system implementation
 * 
 * also an example
 */

import { Dentry, FileSystemType, Mount } from "./fs"

class InMemoryFSType extends FileSystemType {
    constructor() {
        super("memfs")
    }

    mount(dentry: Dentry): Promise<Mount> {
        return Promise.resolve(new Mount(dentry))
    }
}

const InMemoryFS = new InMemoryFSType()

export {
    InMemoryFSType,
    InMemoryFS
}

