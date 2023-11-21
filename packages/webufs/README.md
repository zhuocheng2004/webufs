## Webufs is a Linux-style filesystem framework.

I just started to write this library. Please wait and see.

### Usage
```ts
import { createDefaultContext } from "@webufs/webufs"

// Yes, it's async
let ctx = await createDefaultContext()

ctx.mkdir('a')
ctx.chdir('/a')
console.log(ctx.getcwd())
ctx.chdir('..')
ctx.rmdir('./a/')
// ...
```

### Hope

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
