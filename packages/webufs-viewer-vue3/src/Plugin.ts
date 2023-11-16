
import { App, Plugin } from 'vue'
import Viewer from './Viewer.vue'

export const WebufsPlugin: Plugin = {
    install(app: App, ...options) {
        app.component('WebufsViewer', Viewer)
    }
}
