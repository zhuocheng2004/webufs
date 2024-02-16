import { describe, expect, test } from '@jest/globals'

import { indexedDB } from 'fake-indexeddb'

import { DirEntryType, createDefaultContext, StatConst } from '../../webufs/build/index'
import { IDBFS } from '../build/index'

describe('Jest Environment Test', () => {
    test('Get Webufs', async () => {
        const ctx = await createDefaultContext()
        expect(ctx).toBeDefined()
    })

    test('Mount idbfs', async () => {
        const ctx = await createDefaultContext()
        ctx.getVFS().registerFSType(IDBFS)
        await ctx.mkdir('idb')
        await ctx.mount('idbfs', '/idb', { indexedDB: indexedDB })
    })
})

describe('Directory Operation Test', () => {
    test('getcwd/chdir/mkdir/rmdir', async () => {
        const ctx = await createDefaultContext()
        ctx.getVFS().registerFSType(IDBFS)
        await ctx.mkdir('idb')
        await ctx.mount('idbfs', '/idb', { indexedDB: indexedDB })
        await ctx.chdir('idb')
        expect(ctx.getcwd()).toBe('/idb')

        await ctx.mkdir('a/')
        await ctx.mkdir('a//b')
        await ctx.mkdir('a/b//c/')
        await ctx.mkdir('a/./b/../b///c/d/')
        await ctx.chdir('./a//b/c////../c/./d/././../d//')
        expect(ctx.getcwd()).toBe('/idb/a/b/c/d')

        await ctx.chdir('/')
        expect(ctx.getcwd()).toBe('/')

        await ctx.rmdir('/idb/a/b/c/d/////')
        await ctx.chdir('/idb/a/b')
        await ctx.rmdir('../b/.//c')
        await ctx.chdir('..')
        await ctx.rmdir('b')
        await ctx.chdir('..')
        await ctx.rmdir('a')

        expect(ctx.getcwd()).toBe('/idb')
    })

    test('scan files in dir', async () => {
        const ctx = await createDefaultContext()
        ctx.getVFS().registerFSType(IDBFS)
        await ctx.mkdir('idb')
        await ctx.mount('idbfs', '/idb', { indexedDB: indexedDB })
        await ctx.chdir('idb')

        await ctx.mkdir('d1')
        await ctx.mkdir('d2')

        await ctx.mkdir('d3')
        // subdir files shouldn't affect this dir
        await ctx.chdir('d3')
        await ctx.mkdir('abcdefgh')
        await ctx.chdir('..')

        let fd = await ctx.open('/idb', { directory: true })
        let fileInfos = await fd.getdents()
        expect(fileInfos.length).toBe(3)
        for (let entry of fileInfos) {
            switch (entry.name) {
                case 'd1':
                case 'd2':
                case 'd3':
                    expect(entry.type).toBe(DirEntryType.DT_DIR)
                    break
                default:
                    throw Error('found non-recognized file')
            }
        }
    })
})

describe('File Operation Test', () => {
    test('seek/read/write', async () => {
        const ctx = await createDefaultContext()
        ctx.getVFS().registerFSType(IDBFS)
        await ctx.mkdir('idb')
        await ctx.mount('idbfs', '/idb', { indexedDB: indexedDB })
        await ctx.chdir('idb')
    })

    test('large data read/write', async () => {
        const ctx = await createDefaultContext()
        ctx.getVFS().registerFSType(IDBFS)
        await ctx.mkdir('idb')
        await ctx.mount('idbfs', '/idb', { indexedDB: indexedDB })
        await ctx.chdir('idb')
    })

    test('stat', async () => {
        const ctx = await createDefaultContext()
        ctx.getVFS().registerFSType(IDBFS)
        await ctx.mkdir('idb')
        await ctx.mount('idbfs', '/idb', { indexedDB: indexedDB })
        await ctx.chdir('idb')

        await ctx.mkdir('dir')
        let stat = await ctx.stat('dir/')
        expect(stat.size).toBe(0)
        expect(stat.mode & StatConst.IFMT).toBe(StatConst.IFDIR)
    })

    test('link/unlink', async () => {
        const ctx = await createDefaultContext()
        ctx.getVFS().registerFSType(IDBFS)
        await ctx.mkdir('idb')
        await ctx.mount('idbfs', '/idb', { indexedDB: indexedDB })
        await ctx.chdir('idb')
    })
})
