# Webufs browser-side usable js library.

This package builds the webufs package as an `iife` js library, 
which is usable in browser.


## Usage
```html
<!-- use unpkg -->
<script src="https://www.unpkg.com/@webufs/webufs-browser@latest/build/webufs.min.js"></script>
<!-- or download as static file on your server -->
<script src="webufs.min.js"></script>
```

and then
```js

// Yes, it's async
const ctx = await webufs.createDefaultContext()

// ... now play with 'ctx'
```

For details on how to use it, please read the document of core package "@webufs/webufs"
