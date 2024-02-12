import { DirEntryType } from '@webufs/webufs'

const dentryTypeNames: Map<number, string> = new Map()
dentryTypeNames
    .set(DirEntryType.DT_BLK, 'BLK')
    .set(DirEntryType.DT_CHR, 'CHR')
    .set(DirEntryType.DT_DIR, 'DIR')
    .set(DirEntryType.DT_FIFO, 'FIFO')
    .set(DirEntryType.DT_LNK, 'LNK')
    .set(DirEntryType.DT_REG, 'REG')
    .set(DirEntryType.DT_SOCK, 'SOCK')
    .set(DirEntryType.DT_UNKNOWN, 'UNKNOWN')

export { dentryTypeNames }
