# An example vue3 component library for testing and playing with Webufs

Webufs-viewer-vue3 provides an example vue3 component
to manage files in the current webufs file system (`@webufs/webufs`).

## Usage (Vue3)
```vue
<script>
import { WebufsViewer } from "@webufs/webufs-viewer-vue3";
import { IDBFS } from "@webufs/webufs-idb";

export default {
  data() {
    return {
      context: undefined,
      errMsg: "",
    };
  },
  methods: {
    async onInit(context) {
      try {
        this.context = context;
        this.context.getVFS().registerFSType(IDBFS);

        await this.context.mkdir("idb");
        await this.context.mount("idbfs", "/idb");

        await this.$refs.viewer.update();
      } catch (e) {
        this.onError(e);
      }
    },
    onError(e) {
      this.errMsg = e.message + "\n" + this.errMsg;
    },
  },
  components: {
    WebufsViewer,
  },
};
</script>

<template>
  <div class="container">
    <a href="./game/"><h1 class="my-3">Play Game</h1></a>
    <hr />
    <WebufsViewer ref="viewer" @init="onInit" @error="onError" />
    <hr />
    <div>
      <button @click="errMsg = ''">Clear Message</button>
      <pre style="color: red">{{ errMsg }}</pre>
    </div>
  </div>
</template>

```
