
import nodeResolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import esbuild from 'rollup-plugin-esbuild'

export default [
    {
        input: 'src/index.ts',
        plugins: [ nodeResolve(), esbuild() ],
        output: [
            {
                format: 'iife',
                name: 'webufs',
                file: 'build/webufs.js',
            },
        ]
    },
    {
        input: 'src/index.ts',
        plugins: [ nodeResolve(), esbuild(), terser() ],
        output: [
            {
                format: 'iife',
                name: 'webufs',
                file: 'build/webufs.min.js',
            },
        ]
    },
]
