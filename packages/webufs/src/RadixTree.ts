
/**
 * Radix-tree: will be used in in-memory buffer implementaion
 */

export class RadixTree<T> {
    root: RadixTreeNode<T>

    constructor(maxLevels: number, bits: number) {
        this.root = new RadixTreeNode(maxLevels, 0, bits)
    }

    getLeaf(index: number): RadixTreeNode<T|undefined> {
        return this.root.getLeaf(index)
    }

    getData(index: number): T|undefined {
        return this.root.getData(index)
    }

    setData(index: number, data?: T) {
        this.root.setData(index, data)
    }
}

export class RadixTreeNode<T> {
    /**
     * Max level numbers
     */
    maxLevels: number

    /**
     * current level in a tree. 
     * ZERO for root level
     */
    level: number

    /**
     * there are at most 2**bits children
     */
    bits: number

    /**
     * child nodes
     */
    children: Array<RadixTreeNode<T>>

    /**
     * custom data. 
     * It should only exist on leaves.
     */
    data?: T

    constructor(maxLevels: number, level: number, bits: number, data?: T) {
        this.maxLevels = maxLevels
        this.level = level
        this.bits = bits
        this.children = new Array(1 << bits)
        this.data = data
    }

    isLeaf(): boolean {
        return this.level === this.maxLevels
    }

    getLeaf(index: number): RadixTreeNode<T|undefined> {
        if (this.isLeaf()) {
            return this
        }

        let shift = (this.maxLevels - this.level - 1) * this.bits
        let i = index >> shift
        i = i & ((1 << this.bits) - 1)
        let next = index & ((1 << shift) - 1)
        //console.log(`index=${index}, i=${i}, next=${next}`)
        let child = this.children[i]
        if (!child) {
            child = this.children[i] = new RadixTreeNode(this.maxLevels, this.level+1, this.bits)
        }

        return child.getLeaf(next)
    }

    getData(index: number): T|undefined {
        return this.getLeaf(index).data
    }

    setData(index: number, data?: T) {
        this.getLeaf(index).data = data
    }
}
