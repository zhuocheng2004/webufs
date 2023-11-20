
import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'

export default [
    {
        input: 'src/index.ts',
        plugins: [ esbuild() ],
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
