
import { Dentry, FileSystemType, VFS } from './fs'

/**
 * The default VFS object - you can always use it.
 * 
 * If you don't have special needs, just use the default one.
 * 
 * Our system can have multiple VFS's (Linux has only one)
 * working at the same time (but the file systems mounted
 * on different VFS's might be related with each other).
 */
let defaultVFS = new VFS()

export {
    Dentry,
    FileSystemType,
    VFS, defaultVFS
}

export default defaultVFS
