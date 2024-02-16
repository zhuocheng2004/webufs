# Webufs, a Linux-style Web Filesystem Framework.

If you want to use this library directly in your browser, please see the document of the package "@webufs/webufs-browser"

I just started to work on this library. The current versions are all unstable. 
I will also improve its performance in the future. Please wait and see.

If you have any issues or suggestions, feel free to discuss them on GitHub. Thanks!

## Usage

The `createDefaultContext` method will mount the default in-memory filesystem at `/` (data will be lost upon closing).

To mount other filesystems, see section `Mounting Other FS` below.

Basic Directory Operation:
```ts
import { createDefaultContext } from '@webufs/webufs'

// Yes, it's async
const ctx = await createDefaultContext()

await ctx.mkdir('a')
await ctx.chdir('/a')
console.log(ctx.getcwd())       /* '/a' */
await ctx.chdir('..')
await ctx.rmdir('./a/')
// ...

// scan directory
fd = await ctx.open('/', { directory: true })
let fileInfos = await fd.getdents()
for (let dirEntry of fileInfos) {
    console.log(`name: ${dirEntry.name}, type: ${dirEntry.type}`)
}
// ...

```

Basic File Operation:
```ts
const fd = await ctx.open('a.txt', { create: true })

const src = new Uint8Array([0x30, 0x31, 0x32, 0x33])
await fd.write(src.buffer)
await fd.write(src.buffer)
await fd.write(src.buffer)

const dst = new ArrayBuffer(8)
const dstView = new DataView(dst)
await fd.seek(2, SeekType.SET)          // offset +2 relative to file start 
// You can seek relative to SET, CUR or END.
await fd.read(dst)
// read data from file into dstView...

//  don't forget to close the file (this will also flush pending writing and release reference)
await fd.close()

// delete a file
await ctx.unlink('a.txt')
```

## Mounting Other FS

We take `@webufs/webufs-idb`, a filesystem implementation of IndexedDB backend, for example:

```ts
import { createDefaultContext } from '@webufs/webufs'
import { IDBFS } from '@webufs/webufs-idb'

const ctx = await createDefaultContext()
ctx.getVFS().registerFSType(IDBFS)
await ctx.mkdir('idb')
await ctx.mount('idbfs', '/idb')
await ctx.chdir('idb')

// See the documentation of '@webufs/webufs-idb' for further detail.
```

FS umounting not implemented yet.

## Hope (not implemented yet)

We might also add shell-like support:
```ts
await sh.cd('/home/user/').run()
await sh.echo('Hello!').pipe(base64()).to('a.txt').run()
await sh.cmd(find('./src', '-name', '*.ts'))
    .pipe(xargs(cat()))
    .pipe(wc('-l'))
    .run()
/**
 * base64, find, cat are util functions using our VFS API.
 */
```

That would be cool.

## Some Ideas
I found that we can generate a URL from Blob and use it to spawn Web Workers. That might give some ideas...

