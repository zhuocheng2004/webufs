# Webufs-idb is an IndexedDB implementation of webufs.

This is a plugin library for `@webufs/webufs` (also an example).


## Usage

```ts
import { createDefaultContext } from '@webufs/webufs'
import { IDBFS } from '@webufs/webufs-idb'

const ctx = await createDefaultContext()
ctx.getVFS().registerFSType(IDBFS)
await ctx.mkdir('idb')
await ctx.mount('idbfs', '/idb')
await ctx.chdir('idb')
```

## Mounting Options

Example:
```ts
import { indexedDB } from 'fake-indexeddb'

// ...

await ctx.mount('idbfs', '/idb', {
	/**
	 * type: IDBFactory
	 * defualt: indexedDB (in the corresponding global context)
	 * 
	 * You can choose any other custom indexedDB implementation
	 * instead of the default one.
	 */
	indexedDB: indexedDB,

	/**
	 * type: string
	 * default: 'webufs-idb'
	 * 
	 * the name of the IndexedDB database that our filesystem uses
	 * as the storage
	 * 
	 * In this way we can have multiple independent idbfs storages 
	 * at the same time.
	 */
	dbName: 'hello-webufs-idb'
})

// ...

```
