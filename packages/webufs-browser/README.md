# Webufs browser-side usable js library.

This projet builds the `@webufs/webufs` package as an `iife` js library, 
which is directly usable in the browser.

Note: `@webufs/webufs-idb` is included in the build.

## Usage
```html
<!-- use unpkg -->
<script src="https://www.unpkg.com/@webufs/webufs-browser@latest/build/webufs.min.js"></script>
<!-- or download as a static file on your server -->
<script src="webufs.min.js"></script>
```

and then
```js

// Yes, it's async
const ctx = await webufs.createDefaultContext()

// Mount IndexedDB-backed Filesystem at '/idb'
ctx.getVFS().registerFSType(webufs.IDBFS)
await ctx.mkdir('idb')
await ctx.mount('idbfs', '/idb')
await ctx.chdir('idb')

// ... now play with 'ctx'
```

For details on how to use it, please read the document of the core package `@webufs/webufs` and `@webufs/webufs-idb`
