
import { describe, expect, test } from '@jest/globals'

import { DirEntryType, SeekType, createDefaultContext } from '@webufs/webufs'

describe('Jest Environment Test', () => {
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

        test('large data read/write', async () => {
                const ctx = await createDefaultContext()

                const N = 0x4000
                const src = new Uint8Array(N)
                for (let i = 0; i < N; i++) {
                        src[i] = Math.floor(Math.random() * 0x100)
                }

                const fd = await ctx.open('a.txt', { create: true })
                fd.write(src.buffer)

                const dst = new ArrayBuffer(N)
                const dstView = new DataView(dst)
                fd.seek(-N, SeekType.END)       // just a test
                fd.read(dst)

                for (let i = 0; i < N; i++) {
                        expect(dstView.getUint8(i)).toBe(src[i])
                }
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
