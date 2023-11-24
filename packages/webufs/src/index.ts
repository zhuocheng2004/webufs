
import { Dentry, FileSystemType } from './fs'
import { VFS, LookupType } from './VFS'
import { Context, FileDescriptor } from './Context'
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


/**
 * Create a default VFS accessing context
 * It has 'memfs' mounted at root as default
 */
async function createDefaultContext(): Promise<Context> {
    let ctx = new Context(defaultVFS)
    await ctx.mountInit('memfs')
    return ctx
}

export {
    Dentry,
    FileSystemType,
    LookupType,
    VFS, defaultVFS, 
    Context, createDefaultContext, FileDescriptor,
    // default FS implementations
    InMemoryFSType, InMemoryFS
}

export default defaultVFS
