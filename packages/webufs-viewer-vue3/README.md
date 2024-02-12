# An example vue3 component library for testing and playing with Webufs

Webufs-viewer-vue3 provides an example vue3 component
to manage files in the current webufs file system (`@webufs/webufs`).

## Usage (Vue3)
```vue
<script>
import { WebufsViewer } from '@webufs/webufs-viewer-vue3'

export default {
    data() {
        return {
            context: undefined,
            errMsg: ''
        }
    },
    methods: {
        async onInit(context) {
            this.context = context
            await this.context.mkdir('dir')
        },
        onError(e) {
            this.errMsg = e.message + '\n' + this.errMsg
        }
    },
    components: {
        WebufsViewer
    }
}
</script>

<template>
    <div class="container">
        <WebufsViewer @init="onInit" @error="onError"/>
        <hr/>
        <pre style="color: red;">{{ errMsg }}</pre>
    </div>
</template>

```