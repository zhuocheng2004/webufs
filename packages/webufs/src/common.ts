/**
 * Common ulitities that can be used as default method implementations in various file systems
 * Also serves as examples
 */

import { Dentry, Inode, InodeType } from './fs'

/*
 * The 'simple*' methods operates at in-memory level.
 */

export async function genericDropInode(inode: Inode) {
    // Note that JavaScript has GC.
    if (inode.dentry && inode.dentry.parent) {
        inode.dentry.parent.remove(inode.dentry)
        if (inode.dentry.parent.inode) {
            inode.dentry.parent.inode.size--
        }
    }
}

export async function simpleLookup(base: Dentry, childName: string): Promise<Dentry | null> {
    for (const subdir of base.children) {
        if (subdir.name === childName) {
            return subdir
        }
    }
    return null
}

export async function simpleCreate(inode: Inode, dentry: Dentry) {
    dentry.inode = inode
    if (!dentry.parent.inode) throw Error('negative parent dentry')
    await inode.get()
    dentry.parent.add(dentry)
    dentry.parent.inode.size++
}

export async function simpleUnlink(dentry: Dentry) {
    if (!dentry.inode) throw Error('negative dentry')
    await dentry.inode.put()
    dentry.parent.remove(dentry)
}

export async function simpleMkdir(dentry: Dentry) {
    if (!dentry.inode) throw Error('negative dentry')
    if (dentry.inode.type !== InodeType.DIR) throw Error('inode type not dir')
    await simpleCreate(dentry.inode, dentry)
}

export async function simpleRmdir(dentry: Dentry) {
    if (!dentry.inode) throw Error('negative dentry')
    if (dentry.inode.type !== InodeType.DIR) throw new Error('not a directory')
    if (dentry.children.length > 0) throw new Error('directory not empty')
    await dentry.inode.put()
    dentry.parent.remove(dentry)
}
