## Webufs browser-side usable js library.

This package builds the webufs as an `iife` js library, 
which is usable in browser.

### Usage
```html
<script src="webufs.js"></script>
```
and then
```js

// Yes, it's async
let ctx = await webufs.createDefaultContext()

ctx.mkdir('a')
ctx.chdir('/a')
console.log(ctx.getcwd())
ctx.chdir('..')
ctx.rmdir('./a/')
// ...
```
