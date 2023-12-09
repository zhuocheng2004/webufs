
import { describe, expect, test } from '@jest/globals'

import { debug } from '@webufs/webufs'

const ResizableBuffer = debug.ResizableBuffer

describe('ResizableBuffer Test', () => {
        test('common', () => {
                const buffer = new ResizableBuffer()
                expect(buffer.limit).toBe(0)

                const dst = new ArrayBuffer(16)
                const dstView = new DataView(dst)

                expect(() => buffer.read(0, 2, dst)).toThrow()

                const src = new ArrayBuffer(4)
                const srcView = new DataView(src)
                srcView.setUint8(0, 0x30)
                srcView.setUint8(1, 0x31)
                srcView.setUint8(2, 0x32)
                srcView.setUint8(3, 0x33)

                buffer.write(0, 4, src)
                buffer.write(2, 4, src)

                expect(() => buffer.read(0, 8, dst)).toThrow()

                buffer.read(0, 6, dst)
                expect(dstView.getUint8(0)).toBe(0x30)
                expect(dstView.getUint8(1)).toBe(0x31)
                expect(dstView.getUint8(2)).toBe(0x30)
                expect(dstView.getUint8(3)).toBe(0x31)
                expect(dstView.getUint8(4)).toBe(0x32)
                expect(dstView.getUint8(5)).toBe(0x33)

                expect(buffer.limit).toBe(6)
        })

        test('larger data', () => {
                const buffer = new ResizableBuffer()

                const dst = new ArrayBuffer(8)
                const dstView = new DataView(dst)

                const src = new ArrayBuffer(4)
                const srcView = new DataView(src)
                srcView.setUint8(0, 0x30)
                srcView.setUint8(1, 0x31)
                srcView.setUint8(2, 0x32)
                srcView.setUint8(3, 0x33)

                for (let i = 0; i < (ResizableBuffer.PAGE_SIZE / 4 + 2); i++) {
                        buffer.write(i * 4, 4, src)
                }

                expect(buffer.limit).toBe(ResizableBuffer.PAGE_SIZE + 8)

                for (let i = 0; i < (ResizableBuffer.PAGE_SIZE / 8 + 1); i++) {
                        buffer.read(i * 8, 8, dst)
                        expect(dstView.getUint8(0)).toBe(0x30)
                        expect(dstView.getUint8(1)).toBe(0x31)
                        expect(dstView.getUint8(2)).toBe(0x32)
                        expect(dstView.getUint8(3)).toBe(0x33)
                        expect(dstView.getUint8(4)).toBe(0x30)
                        expect(dstView.getUint8(5)).toBe(0x31)
                        expect(dstView.getUint8(6)).toBe(0x32)
                        expect(dstView.getUint8(7)).toBe(0x33)
                }
        })

        test('distant write', () => {
                const buffer = new ResizableBuffer()

                const dst = new ArrayBuffer(4)
                const dstView = new DataView(dst)

                const src = new ArrayBuffer(4)
                const srcView = new DataView(src)
                srcView.setUint8(0, 0x30)
                srcView.setUint8(1, 0x31)
                srcView.setUint8(2, 0x32)
                srcView.setUint8(3, 0x33)

                const N = 100000
                buffer.write(0, 4, src)
                buffer.write(N, 4, src)
                expect(buffer.limit).toBe(N + 4)

                buffer.read(0, 4, dst)
                expect(dstView.getUint8(0)).toBe(0x30)
                expect(dstView.getUint8(1)).toBe(0x31)
                expect(dstView.getUint8(2)).toBe(0x32)
                expect(dstView.getUint8(3)).toBe(0x33)

                buffer.read(N, 4, dst)
                expect(dstView.getUint8(0)).toBe(0x30)
                expect(dstView.getUint8(1)).toBe(0x31)
                expect(dstView.getUint8(2)).toBe(0x32)
                expect(dstView.getUint8(3)).toBe(0x33)
        })
})
