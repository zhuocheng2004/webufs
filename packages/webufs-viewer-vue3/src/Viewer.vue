<script lang="ts">
import { defineComponent } from 'vue'
import { createDefaultContext, Context, StatConst } from '@webufs/webufs'
import { dentryTypeNames } from './helper'

class Item {
    name: string
    mode: number
    size: number
    selected: boolean = false

    constructor(name: string, mode: number, size: number) {
        this.name = name
        this.mode = mode
        this.size = size
    }
}

export default defineComponent({
    data() {
        return {
            dentryTypeNames: dentryTypeNames,
            context: null as null|Context,
            pwd: '',
            items: new Array() as Array<Item>,
            selectedFiles: null as null|FileList,
            allSelect: false
        }
    },
    async created() {
        try {
            this.context = await createDefaultContext()
            this.$emit('init', this.context)
        } catch (e) {
            this.$emit('error', e)
        }
        await this.update()
    },
    methods: {
        updatePWD() {
            this.pwd = this.context ? this.context.getcwd() : ''
        },
        async updateItems() {
            if (!this.context) {
                this.items = new Array()
                return
            }
            
            try {
                let fd = await this.context.open('.', { directory: true })
                let infos = await fd.getdents()
                let list = new Array()
                for (let info of infos) {
                    const stat = await this.context.stat(info.name)
                    list.push(new Item(info.name, stat.mode, stat.size))
                }
                list.sort()
                this.items = list
            } catch (e) {
                this.$emit('error', e)
            }
        },
        async update() {
            this.updatePWD()
            await this.updateItems()
            this.allSelect = false
        },
        async chdir(path: string) {
            try {
                await this.context?.chdir(path)
            } catch (e) {
                this.$emit('error', e)
            }
            await this.update()
        },
        async mkdir(name: string) {
            try {
                await this.context?.mkdir(name)
            } catch (e) {
                this.$emit('error', e)
            }
            await this.update()
        },
        displayName(item: Item): string {
            let name = item.name
            if ((item.mode & StatConst.IFMT) === StatConst.IFDIR) {
                name += '/'
            }
            return name
        },
        async itemOnClick(name: string) {
            if (!this.context) return
            try {
                const stat = await this.context.stat(name)
                let type = stat.mode & StatConst.IFMT
                if (type === StatConst.IFDIR) {
                    await this.chdir(name)
                } else if (type === StatConst.IFREG || type === StatConst.IFLNK) {
                    await this.downloadFile(name)
                }
            } catch (e) {
                this.$emit('error', e)
            }
        },
        async downloadFile(name: string) {
            if (!this.context) return
            try {
                const fd = await this.context.open(name)
                const stat = await this.context.stat(name)
                const buffer = new ArrayBuffer(stat.size)
                await fd.read(buffer)
                await fd.close()
                const blob = new Blob([buffer])
                const element = document.createElement('a')
                element.href = URL.createObjectURL(blob)
                element.download = name
                element.click()
            } catch (e) {
                this.$emit('error', e)
            }
        },
        async mkdirOnClick() {
            let name = prompt('dir name')
            if (name) await this.mkdir(name)
        },
        async uploadOnChange(event: Event) {
            if (!event.target) return
            let files = (event.target as HTMLInputElement).files
            if (!files) {
                this.selectedFiles = null
                return
            }
            this.selectedFiles = files
        },
        async uploadFiles() {
            if (!this.context) return
            if (!this.selectedFiles) return
            for (let file of this.selectedFiles) {
                try {
                    const stat = await this.context.stat(file.name)
                    this.$emit('error', new Error(`cannot upload file "${file.name}": already exists`))
                    continue
                } catch (e) { }
                const reader = new FileReader()
                reader.onload = async ev => {
                    if (!this.context) return
                    if (!ev.target) return
                    try {
                        const fd = await this.context.open(file.name, { create: true })
                        await fd.write(ev.target.result as ArrayBuffer, file.size)
                        await fd.close()
                    } catch (e) {
                        this.$emit('error', e)
                    }
                    await this.update()
                }
                reader.readAsArrayBuffer(file)
            }
        },
        async unlinkSelected() {
            if (!this.context) return
            for (let item of this.items) {
                if (!item.selected) continue
                if ((item.mode & StatConst.IFMT) !== StatConst.IFDIR) {
                    try {
                        await this.context.unlink(item.name)
                    } catch (e) {
                        this.$emit('error', e)
                    }
                } else {
                    this.$emit('error', new Error(`cannot unlink dir "${item.name}"`))
                }
            }
            await this.update()
        },
        async rmdirSelected() {
            if (!this.context) return
            for (let item of this.items) {
                if (!item.selected) continue
                if ((item.mode & StatConst.IFMT) === StatConst.IFDIR) {
                    try {
                        await this.context.rmdir(item.name)
                    } catch (e) {
                        this.$emit('error', e)
                    }
                } else {
                    this.$emit('error', new Error(`cannot rmdir "${item.name}": not a dir`))
                }
            }
            await this.update()
        }
    },
})
</script>

<template>
    <div>
        <div v-if="context === null">
            <h2>File system preparing...</h2>
        </div>
        <div v-else>
            <h2>{{ pwd }}</h2>
        </div>
        <div>
            <button style="margin-left: 0.8em;" @click="update()">Refresh</button>
            <button style="margin-left: 0.8em;" @click="chdir('..')">Go to Parent</button>
            <span v-if="items.reduce((prev, curr) => prev || curr.selected, false) /* any one selected */">
                <button style="margin-left: 0.8em;" @click="unlinkSelected">unlink</button>
                <button style="margin-left: 0.8em;" @click="rmdirSelected">rmdir</button>
                <!-- <button style="margin-left: 0.8em;">Delete Recursively</button> -->
            </span>
        </div>
        <div>
            <table>
                <thead>
                    <tr>
                        <th width="3%">
                            <input v-model="allSelect" type="checkbox" @change="items.map(item => { item.selected = allSelect })">
                        </th>
                        <th width="3%"></th>
                        <th width="5%"></th>
                        <th width="63%">Name</th>
                        <th width="11%">Size</th>
                        <th width="15%">Last Update</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="entry in items">
                        <td>
                            <input v-model="entry.selected" type="checkbox" @change="allSelect = items.reduce((prev, curr) => prev && curr.selected, true)">
                        </td>
                        <th width="3%"></th>
                        <th width="5%"></th>
                        <td><a href="javascript:void(0);" @click="itemOnClick(entry.name)">{{ displayName(entry) }}</a></td>
                        <td>{{ entry.size }}</td>
                        <td>0</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <hr/>
        <div>
            <div>
                <span></span>
                <button @click="mkdirOnClick">mkdir</button>
            </div>
            <div>
                <span>Choose File: </span>
                <input id="input" type="file" @change="uploadOnChange"/>
                <button @click="uploadFiles">Upload</button>
            </div>
        </div>
    </div>
</template>
