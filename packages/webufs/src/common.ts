/**
 * Common ulitities that can be used as default method implementations in various file systems
 * Also serves as examples
 */

import { Dentry, Inode, InodeType } from "./fs"

/*
 * The 'simple*' methods operates on in-memory level.
 */

export async function simpleCreaate(inode: Inode, dentry: Dentry) {
    dentry.inode = inode
}

export async function simpleRmdir(dentry: Dentry) {
    if (dentry.inode && dentry.inode.type !== InodeType.DIR) throw new Error('not a directory')
    if (dentry.children.length > 0) throw new Error('directory not empty')

    dentry.parent.remove(dentry)
}
