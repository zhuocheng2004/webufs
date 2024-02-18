/**
 * Byte Buffer that is resizable.
 *
 * Implemented using radix-tree
 *
 * Feature: Only allocate memory on writing.
 */

import { RadixTree } from './RadixTree'

export class ResizableBuffer {
    /**
     * 8 levels, 4 bits/level, totally at most 2**32 leaves, 4K per leaf, should be enough
     */
    static readonly MAX_LEVELS = 8
    static readonly BITS_PER_LEVEL = 4
    static readonly PAGE_SHIFT = 12
    static readonly PAGE_SIZE = 1 << this.PAGE_SHIFT
    static readonly PAGE_MASK = this.PAGE_SIZE - 1

    tree: RadixTree<Uint8Array> = new RadixTree(ResizableBuffer.MAX_LEVELS, ResizableBuffer.BITS_PER_LEVEL)

    /**
     * Reading cannot go beyond limit
     * Writing will increase limit
     */
    limit: number = 0

    getBuffer(addr: number): Uint8Array {
        if (addr && ResizableBuffer.PAGE_MASK) {
            throw Error('addr is not multiples of page size')
        }

        return this.getBufferIdx(addr >> ResizableBuffer.PAGE_SHIFT)
    }

    getBufferIdx(index: number): Uint8Array {
        const node = this.tree.getLeaf(index)

        let array: Uint8Array
        if (node.data) {
            array = node.data
        } else {
            array = new Uint8Array(ResizableBuffer.PAGE_SIZE) // allocate new
            node.data = array
        }

        return array
    }

    read(offset: number, size: number, dest: ArrayBuffer): number {
        if (size <= 0) return 0
        if (offset > this.limit) throw Error('reading out of range')

        if (offset + size > this.limit) size = this.limit - offset

        let index = offset >> ResizableBuffer.PAGE_SHIFT
        let rel = offset & ResizableBuffer.PAGE_MASK

        let buffer = this.getBufferIdx(index)

        const view = new DataView(dest)

        for (let i = 0; i < size; i++) {
            if (rel >= ResizableBuffer.PAGE_SIZE) {
                rel -= ResizableBuffer.PAGE_SIZE
                index++
                buffer = this.getBufferIdx(index)
            }

            view.setUint8(i, buffer[rel])

            rel++
        }

        return size
    }

    write(offset: number, size: number, src: ArrayBuffer) {
        const view = new DataView(src)

        let index = offset >> ResizableBuffer.PAGE_SHIFT
        let rel = offset & ResizableBuffer.PAGE_MASK

        let buffer = this.getBufferIdx(index)

        for (let i = 0; i < size; i++) {
            if (rel >= ResizableBuffer.PAGE_SIZE) {
                rel -= ResizableBuffer.PAGE_SIZE
                index++
                buffer = this.getBufferIdx(index)
            }

            //console.log(`Writing ${view.getUint8(i)}@${rel}`)
            buffer[rel] = view.getUint8(i)

            rel++
        }

        if (offset + size > this.limit) {
            this.limit = offset + size
        }
    }
}
