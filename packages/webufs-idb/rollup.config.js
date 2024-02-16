import nodeResolve from '@rollup/plugin-node-resolve'
import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'

export default [
    {
        input: 'src/index.ts',
        plugins: [nodeResolve(), esbuild()],
        output: [
            {
                format: 'es',
                dir: 'build',
            },
        ],
        external: ['@webufs/webufs'],
    },
    {
        input: 'src/index.ts',
        plugins: [nodeResolve(), dts()],
        output: [
            {
                format: 'es',
                dir: 'build',
            },
        ],
        external: ['@webufs/webufs'],
    },
]
