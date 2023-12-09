
import { describe, expect, test } from '@jest/globals'

import { debug } from '@webufs/webufs'

const RadixTree = debug.RadixTree

describe('RadixTree Test', () => {
        test('level-1 test1', () => {
                // One level, which means leaves are directly linked to the root node.
                const tree = new RadixTree(1, 4)
                for (let i = 0; i < 16; i++) {
                        expect(tree.root.children[i]).toBeUndefined()
                }
                tree.getLeaf(0)
                expect(tree.root.children[0]).not.toBeUndefined()
                for (let i = 1; i < 16; i++) {
                        expect(tree.root.children[i]).toBeUndefined()
                }
                tree.getLeaf(0)
                expect(tree.root.children[0]).not.toBeUndefined()
                for (let i = 1; i < 16; i++) {
                        expect(tree.root.children[i]).toBeUndefined()
                }
                tree.getLeaf(1)
                expect(tree.root.children[0]).not.toBeUndefined()
                expect(tree.root.children[1]).not.toBeUndefined()
                for (let i = 2; i < 16; i++) {
                        expect(tree.root.children[i]).toBeUndefined()
                }
        })

        test('level-1 test2', () => {
                const tree = new RadixTree(1, 4)
                tree.getLeaf(1)
                tree.getLeaf(3)
                expect(tree.root.children[0]).toBeUndefined()
                expect(tree.root.children[1]).not.toBeUndefined()
                expect(tree.root.children[2]).toBeUndefined()
                expect(tree.root.children[3]).not.toBeUndefined()
                for (let i = 4; i < 16; i++) {
                        expect(tree.root.children[i]).toBeUndefined()
                }
        })

        test('level-2 test1', () => {
                // two levels: one intermediate level between the root and leaves.
                const tree = new RadixTree(2, 2)
                tree.getLeaf(0)
                expect(tree.root.children[0]).not.toBeUndefined()
                for (let i = 1; i < 4; i++) {
                        expect(tree.root.children[i]).toBeUndefined()
                }
                const node = tree.root.children[0]
                expect(node.children[0]).not.toBeUndefined()
                for (let i = 1; i < 4; i++) {
                        expect(node.children[i]).toBeUndefined()
                }
        })

        test('level-2 test2', () => {
                const tree = new RadixTree(2, 2)
                tree.getLeaf(1)
                tree.getLeaf(10)
                expect(tree.root.children[0]).not.toBeUndefined()
                expect(tree.root.children[1]).toBeUndefined()
                expect(tree.root.children[2]).not.toBeUndefined()
                expect(tree.root.children[3]).toBeUndefined()

                const node1 = tree.root.children[0]
                expect(node1.children[0]).toBeUndefined()
                expect(node1.children[1]).not.toBeUndefined()
                expect(node1.children[2]).toBeUndefined()
                expect(node1.children[3]).toBeUndefined()

                const node2 = tree.root.children[2]
                expect(node2.children[0]).toBeUndefined()       //  8
                expect(node2.children[1]).toBeUndefined()       //  9
                expect(node2.children[2]).not.toBeUndefined()   // 10
                expect(node2.children[3]).toBeUndefined()       // 11
        })

        test('level-3 test1', () => {
                const tree = new RadixTree(3, 2)
                tree.getLeaf(43)
                expect(tree.root.children[0]).toBeUndefined()           //  0 ~ 15
                expect(tree.root.children[1]).toBeUndefined()           // 16 ~ 31
                expect(tree.root.children[2]).not.toBeUndefined()       // 32 ~ 47
                expect(tree.root.children[3]).toBeUndefined()           // 48 ~ 63

                const node1 = tree.root.children[2]
                expect(node1.children[0]).toBeUndefined()       //  0 ~  3
                expect(node1.children[1]).toBeUndefined()       //  4 ~  7
                expect(node1.children[2]).not.toBeUndefined()   //  8 ~ 11
                expect(node1.children[3]).toBeUndefined()       // 12 ~ 15

                const node2 = node1.children[2]
                expect(node2.children[0]).toBeUndefined()
                expect(node2.children[1]).toBeUndefined()
                expect(node2.children[2]).toBeUndefined()
                expect(node2.children[3]).not.toBeUndefined()
        })
})
