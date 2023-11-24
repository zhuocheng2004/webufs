
/**
 * Byte Buffer that is resizable.
 * 
 * Implemented using radix-tree
 * 
 * Characteristic: Only allocate memory on writing.
 */

import { RadixTree } from "./RadixTree";

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

        let node = this.tree.getLeaf(addr >> ResizableBuffer.PAGE_SHIFT)

        let array: Uint8Array
        if (node.data) {
            array = node.data
        } else {
            array = new Uint8Array(ResizableBuffer.PAGE_SIZE);  // allocate new
            node.data = array
        }

        return array
    }

    read(offset: number, size: number, dest: ArrayBuffer) {
        if (offset + size > this.limit) {
            throw Error('reading out of range')
        }

        let index = offset >> ResizableBuffer.PAGE_SHIFT
        let rel = offset && ResizableBuffer.PAGE_MASK

        let buffer = this.getBuffer(index)
    
        let view = new DataView(dest)
    
        for (let i = 0; i < size; i++) {
            if (rel >= ResizableBuffer.PAGE_SIZE) {
                rel -= ResizableBuffer.PAGE_SIZE
                index++
                buffer = this.getBuffer(index)
            }

            view.setUint8(i, buffer[rel])

            rel++
        }
    }

    write(offset: number, size: number, src: ArrayBuffer) {
        let view = new DataView(src)

        let index = offset >> ResizableBuffer.PAGE_SHIFT
        let rel = offset && ResizableBuffer.PAGE_MASK

        let buffer = this.getBuffer(index)

        for (let i = 0; i < size; i++) {
            if (rel >= ResizableBuffer.PAGE_SIZE) {
                rel -= ResizableBuffer.PAGE_SIZE
                index++
                buffer = this.getBuffer(index)
            }

            buffer[rel] = view.getUint8(i)

            rel++
        }

        if (offset + size > this.limit) {
            this.limit = offset + size
        }
    }
}
