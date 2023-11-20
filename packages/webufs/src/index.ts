
import { Dentry, FileSystemType } from './fs'
import { VFS, LookupType } from './VFS'
import { Context } from './Context'
import { InMemoryFSType, InMemoryFS } from './memory'

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
defaultVFS.registerFSType(InMemoryFS)

let defaultContext = new Promise(async (resolve, reject) => {
    let ctx = new Context(defaultVFS)
    await ctx.mountInit('memfs')
    resolve(ctx)
})

export {
    Dentry,
    FileSystemType,
    LookupType,
    VFS, defaultVFS, 
    Context, defaultContext,
    // default FS implementations
    InMemoryFSType, InMemoryFS
}

export default defaultVFS
