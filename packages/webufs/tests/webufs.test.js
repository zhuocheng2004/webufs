
import { describe, expect, test } from '@jest/globals'

import { SeekType, createDefaultContext } from '@webufs/webufs'

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

                const fd = await ctx.open('a.txt', { create: true })

                const src = new ArrayBuffer(4)
                const srcView = new DataView(src)
                srcView.setUint8(0, 0x30)
                srcView.setUint8(1, 0x31)
                srcView.setUint8(2, 0x32)
                srcView.setUint8(3, 0x33)

                await fd.write(src)
                await fd.write(src)
                await fd.write(src)
                await fd.write(src)

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
        })
})
