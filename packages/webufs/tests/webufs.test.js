import { describe, expect, test } from '@jest/globals'

import { DirEntryType, SeekType, createDefaultContext, StatConst, Status } from '../build/index'

describe('Environment Test', () => {
    test('Get Webufs', async () => {
        const ctx = await createDefaultContext()
        expect(ctx).toBeDefined()
    })
})

describe('Directory Operation Test', () => {
    test('getcwd/chdir/mkdir/rmdir', async () => {
        const ctx = await createDefaultContext()
        expect(ctx.getcwd()).toBe('/')

        await ctx.mkdir('dir')
        await ctx.chdir('dir')
        expect(ctx.getcwd()).toBe('/dir')

        await ctx.chdir('////////')
        await ctx.chdir('..')
        expect(ctx.getcwd()).toBe('/')
        await ctx.chdir('..///../../../////../')
        expect(ctx.getcwd()).toBe('/')

        await ctx.mkdir('a/')
        await ctx.mkdir('a//b')
        await ctx.mkdir('a/b//c/')
        await ctx.mkdir('a/./b/../b///c/d/')
        await ctx.chdir('./a//b/c////../c/./d/././../d//')
        expect(ctx.getcwd()).toBe('/a/b/c/d')

        await ctx.chdir('/')
        expect(ctx.getcwd()).toBe('/')

        await ctx.rmdir('a/b/c/d/////')
        await ctx.chdir('a/b')
        await ctx.rmdir('../b/.//c')
        await ctx.chdir('..')
        await ctx.rmdir('b')
        await ctx.chdir('..')
        await ctx.rmdir('a')

        await ctx.rmdir('dir')

        await ctx.chdir('///////////////////////////////////////////////////////////////')
        expect(ctx.getcwd()).toBe('/')
        await ctx.chdir('../../../../../../../../../../../../../../../../../../../../..')
        expect(ctx.getcwd()).toBe('/')
    })

    test('scan files in dir', async () => {
        const ctx = await createDefaultContext()

        let fd = await ctx.open('a.txt', { create: true })
        const src = new Uint8Array([0x30, 0x31, 0x32, 0x33])
        for (let i = 0; i < 1000; i++) {
            fd.write(src.buffer)
        }
        await fd.close()

        await ctx.mkdir('d1')
        await ctx.mkdir('d2')

        fd = await ctx.open('b.txt', { create: true })
        await fd.close()

        await ctx.mkdir('d3')
        // subdir files shouldn't affect this dir
        await ctx.chdir('d3')
        await ctx.mkdir('abcdefgh')
        fd = await ctx.open('xyzw.cpp', { create: true })
        await fd.close()
        await ctx.chdir('..')

        fd = await ctx.open('/', { directory: true })
        let fileInfos = await fd.getdents()
        expect(fileInfos.length).toBe(5)
        for (let entry of fileInfos) {
            switch (entry.name) {
                case 'a.txt':
                case 'b.txt':
                    expect(entry.type).toBe(DirEntryType.DT_REG)
                    break
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

        await ctx.mkdir('a')
        await ctx.mkdir('a/b')
        await ctx.chdir('a/b')

        const fd = await ctx.open('a.txt', { create: true })

        const src = new Uint8Array([0x30, 0x31, 0x32, 0x33])

        await fd.write(src.buffer)
        await fd.write(src.buffer)
        await fd.write(src.buffer)
        await fd.write(src.buffer)

        const dst = new ArrayBuffer(16)
        const dstView = new DataView(dst)

        await fd.seek(0, SeekType.SET)
        await fd.read(dst)
        for (let i = 0; i < 4; i++) {
            expect(dstView.getUint8(i * 4 + 0)).toBe(0x30)
            expect(dstView.getUint8(i * 4 + 1)).toBe(0x31)
            expect(dstView.getUint8(i * 4 + 2)).toBe(0x32)
            expect(dstView.getUint8(i * 4 + 3)).toBe(0x33)
        }

        await fd.seek(-12, SeekType.CUR)
        await fd.read(dst, 8)
        for (let i = 0; i < 2; i++) {
            expect(dstView.getUint8(i * 4 + 0)).toBe(0x30)
            expect(dstView.getUint8(i * 4 + 1)).toBe(0x31)
            expect(dstView.getUint8(i * 4 + 2)).toBe(0x32)
            expect(dstView.getUint8(i * 4 + 3)).toBe(0x33)
        }

        await fd.seek(2, SeekType.SET)
        await fd.read(dst, 8)
        for (let i = 0; i < 2; i++) {
            expect(dstView.getUint8(i * 4 + 0)).toBe(0x32)
            expect(dstView.getUint8(i * 4 + 1)).toBe(0x33)
            expect(dstView.getUint8(i * 4 + 2)).toBe(0x30)
            expect(dstView.getUint8(i * 4 + 3)).toBe(0x31)
        }

        await fd.seek(-13, SeekType.END)
        await fd.read(dst, 8)
        for (let i = 0; i < 2; i++) {
            expect(dstView.getUint8(i * 4 + 0)).toBe(0x33)
            expect(dstView.getUint8(i * 4 + 1)).toBe(0x30)
            expect(dstView.getUint8(i * 4 + 2)).toBe(0x31)
            expect(dstView.getUint8(i * 4 + 3)).toBe(0x32)
        }

        await fd.close()
    })

    test('readonly', async () => {
        const ctx = await createDefaultContext()

        let fd = await ctx.open('a.txt', { create: true })
        const src = new Uint8Array([0x30, 0x31, 0x32, 0x33])
        await fd.write(src.buffer)
        await fd.close()

        fd = await ctx.open('a.txt', { readonly: true })

        const dst = new ArrayBuffer(16)
        const dstView = new DataView(dst)

        await fd.read(dst)
        expect(dstView.getUint8(0)).toBe(0x30)
        expect(dstView.getUint8(1)).toBe(0x31)
        expect(dstView.getUint8(2)).toBe(0x32)
        expect(dstView.getUint8(3)).toBe(0x33)

        await expect(() => fd.write(src)).rejects.toThrow()

        await fd.close()
    })

    test('partial read', async () => {
        const ctx = await createDefaultContext()

        const fd = await ctx.open('a.txt', { create: true })

        const src = new Uint8Array([0x30, 0x31, 0x32, 0x33])

        await fd.write(src.buffer)
        await fd.seek(-2, SeekType.CUR)
        await fd.write(src.buffer)

        const dst = new ArrayBuffer(16)
        const dstView = new DataView(dst)

        await fd.seek(0, SeekType.SET)
        let cnt = await fd.read(dst)

        expect(cnt).toBe(6)

        expect(dstView.getUint8(0)).toBe(0x30)
        expect(dstView.getUint8(1)).toBe(0x31)
        expect(dstView.getUint8(2)).toBe(0x30)
        expect(dstView.getUint8(3)).toBe(0x31)
        expect(dstView.getUint8(4)).toBe(0x32)
        expect(dstView.getUint8(5)).toBe(0x33)

        cnt = await fd.read(dst)
        expect(cnt).toBe(0)

        await fd.close()
    })

    test('read unknown size', async () => {
        const ctx = await createDefaultContext()

        let fd = await ctx.open('a.txt', { create: true })
        const src = new Uint8Array([0x30, 0x31, 0x32, 0x33])
        const N = 0x1234
        for (let i = 0; i < N; i++) await fd.write(src.buffer)
        await fd.close()

        fd = await ctx.open('a.txt', { readonly: true })
        let size = 0
        const A = 123
        const dst = new ArrayBuffer(A)
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const cnt = await fd.read(dst)
            size += cnt
            if (cnt < A) break
        }
        expect(size).toBe(N * 4)
        await fd.close()
    })

    test('large data read/write', async () => {
        const ctx = await createDefaultContext()

        const N = 0x20000
        const src = new Uint8Array(N)
        for (let i = 0; i < N; i++) {
            src[i] = Math.floor(Math.random() * 0x100)
        }

        const fd = await ctx.open('a.txt', { create: true })
        await fd.write(src.buffer)

        const dst = new ArrayBuffer(N)
        const dstView = new DataView(dst)
        await fd.seek(-N, SeekType.END) // just a test
        await fd.read(dst)
        await fd.close()

        for (let i = 0; i < N; i++) {
            expect(dstView.getUint8(i)).toBe(src[i])
        }
    })

    test('stat', async () => {
        const ctx = await createDefaultContext()

        const N = 0x20000
        const src = new Uint8Array(N)
        for (let i = 0; i < N; i++) {
            src[i] = Math.floor(Math.random() * 0x100)
        }

        let fd = await ctx.open('a.txt', { create: true })
        await fd.write(src.buffer)
        await fd.close()

        let stat = await ctx.stat('a.txt')
        expect(stat.size).toBe(0x20000)
        expect(stat.mode & StatConst.IFMT).toBe(StatConst.IFREG)

        fd = await ctx.open('b.txt', { create: true })
        await fd.write(src.buffer.slice(0, 100))
        await fd.close()

        stat = await ctx.stat('b.txt')
        expect(stat.size).toBe(100)
        expect(stat.mode & StatConst.IFMT).toBe(StatConst.IFREG)

        fd = await ctx.open('c.txt', { create: true })
        await fd.write(src.buffer.slice(0, 0x12345))
        await fd.close()

        stat = await ctx.stat('c.txt')
        expect(stat.size).toBe(0x12345)
        expect(stat.mode & StatConst.IFMT).toBe(StatConst.IFREG)

        await ctx.mkdir('dir')
        stat = await ctx.stat('dir/')
        expect(stat.size).toBe(0)
        expect(stat.mode & StatConst.IFMT).toBe(StatConst.IFDIR)

        let status = await ctx.access('b.txt')
        expect(status).toBe(Status.SUCCESS)
        status = await ctx.access('dir')
        expect(status).toBe(Status.SUCCESS)
        status = await ctx.access('d.png')
        expect(status).toBe(Status.NOENT)
    })

    test('link/unlink', async () => {
        const ctx = await createDefaultContext()

        let fd = await ctx.open('a.txt', { create: true })
        await fd.close()

        fd = await ctx.open('/', { directory: true })
        let fileInfos = await fd.getdents()
        expect(fileInfos.length).toBe(1)
        await fd.close()

        await ctx.unlink('/a.txt')

        fd = await ctx.open('/', { directory: true })
        fileInfos = await fd.getdents()
        expect(fileInfos.length).toBe(0)
        await fd.close()
    })
})
