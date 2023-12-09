# Webufs, a Linux-style Filesystem Framework.

I just started to work on this library. Please wait and see.

## Usage

Basic Directory Operation:
```ts
import { createDefaultContext } from "@webufs/webufs"

// Yes, it's async
const ctx = await createDefaultContext()

ctx.mkdir('a')
ctx.chdir('/a')
console.log(ctx.getcwd())       /* '/a' */
ctx.chdir('..')
ctx.rmdir('./a/')
// ...
```

Basic File Operation:
```ts
const fd = await ctx.open('a.txt', { create: true })

const src = new ArrayBuffer(4)
const srcView = new DataView(src)
srcView.setUint8(0, 0x30)
srcView.setUint8(1, 0x31)
srcView.setUint8(2, 0x32)
srcView.setUint8(3, 0x33)
await fd.write(src)
await fd.write(src)

const dst = new ArrayBuffer(8)
const dstView = new DataView(dst)
await fd.seek(0, SeekType.SET)          // You can seek relative to SET, CUR or END, as in the POSIX case.
await fd.read(dst)
// read data from dstView...
```

## Hope

In the future, I hope we could write this kind of code:
```ts
vfs.mount('idbfs', '/mnt')
vfs.chdir('mnt')
vfs.symlink('./a.txt', './b.txt')
vfs.mkdir('dir')
//...
```

We might also add shell-like support:
```ts
sh.cd('/home/user/').run()
sh.echo('Hello!').pipe(base64()).to('a.txt').run()
sh.cmd(find('./src', '-name', '*.ts'))
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

