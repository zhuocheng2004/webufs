
import PeerDepsExternalPlugin from 'rollup-plugin-peer-deps-external'
import vue from 'rollup-plugin-vue'

export default {
    input: 'src/index.ts',
    output: [
        {
            format: 'cjs',
            dir: 'build',
            sourcemap: true
        },
    ],
    plugins: [
        PeerDepsExternalPlugin(),
        vue()
    ]
}
