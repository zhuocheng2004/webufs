
import vue from 'rollup-plugin-vue'
import typescript from 'rollup-plugin-typescript2'

export default {
    input: 'src/index.ts',
    output: [
        {
            format: 'esm',
            dir: 'build',
        },
    ],
    external: [ 'vue' ],
    plugins: [
        vue(),
        typescript({
            tsconfigOverride: {
                compilerOptions: {
                    declaration: true,
                },
                include: null,
            }
        })
    ],
}
