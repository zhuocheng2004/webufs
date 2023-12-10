# Webufs, a Linux-style Filesystem Framework.

I just started to work on this library. Please wait and see.

Currently everything is slow and memory-consuming. I will improve performance in the future.

## Usage

Basic Directory Operation:
```ts
import { createDefaultContext } from "@webufs/webufs"

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
// read data from dstView...
```

## Hope

We might also add shell-like support:
```ts
await sh.cd('/home/user/').run()
await sh.echo('Hello!').pipe(base64()).to('a.txt').run()
await sh.cmd(find('./src', '-name', '*.ts'))
    .pipe(xargs(cat))
    .pipe(wc('-l'))
    .run()
/**
 * base64, find, cat are util functions using our VFS API.
 */
```

That would be cool.

## Some Ideas
I found that we can generate URL from Blob and use it to spawn Web Workers. That might give some ideas...

