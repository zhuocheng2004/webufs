
import { nodeResolve } from '@rollup/plugin-node-resolve'
import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'

export default [
    {
        input: 'src/index.ts',
        plugins: [ nodeResolve(), esbuild() ],
        output: [
            {
                format: 'es',
                dir: 'build',
            },
        ]
    },
    {
        input: 'src/index.ts',
        plugins: [ dts() ],
        output: [
            {
                format: 'es',
                dir: 'build',
            }
        ]
    }
]
