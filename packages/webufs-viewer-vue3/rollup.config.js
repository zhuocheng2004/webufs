
import nodeResolve from '@rollup/plugin-node-resolve'
import esbuild from 'rollup-plugin-esbuild'
import vue from 'rollup-plugin-vue'

export default {
    input: 'src/index.ts',
    output: [
        {
            format: 'esm',
            dir: 'build',
        },
    ],
    external: [ 'vue' ],
    plugins: [ nodeResolve(), vue(), esbuild() ],
}
