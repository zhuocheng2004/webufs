import { App, Plugin } from 'vue'
import ViewerComponentVue from './ViewerComponent.vue'

export const WebufsPlugin: Plugin = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    install(app: App, ...options) {
        app.component('WebufsViewer', ViewerComponentVue)
    },
}
