import { Context } from './Context'
// These are only for debug
import { RadixTree } from './RadixTree'
import { ResizableBuffer } from './ResizableBuffer'
import { VFS } from './VFS'
import { InMemoryFS } from './memory'

/**
 * The default VFS object - you can always use it.
 *
 * If you don't have special needs, just use the default one.
 *
 * Our system can have multiple VFS's (Linux has only one)
 * working at the same time (but the file systems mounted
 * on different VFS's might be related with each other).
 */
const defaultVFS = new VFS()
defaultVFS.registerFSType(InMemoryFS)

/**
 * Create a default VFS accessing context
 * It has 'memfs' mounted at root as default
 */
async function createDefaultContext(): Promise<Context> {
    const ctx = new Context(defaultVFS)
    await ctx.mountInit('memfs')
    return ctx
}

const debug = {
    RadixTree,
    ResizableBuffer,
}

export * from './fs'
export * from './VFS'
export * from './Context'
export * from './memory'

export {
    defaultVFS,
    createDefaultContext,

    // Do not use the following. They are for debug purpose.
    debug,
}
