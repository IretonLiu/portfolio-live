import resolve from '@rollup/plugin-node-resolve'
import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import path from 'path'

export default {
    input: 'src/src/globe.js', // your entry point
    output: {
        file: 'dist/bundle.js',
        format: 'esm', // keep ES modules so you can import addons
        sourcemap: true,
    },
    plugins: [
        alias({
            entries: [
                {
                    find: 'three$',
                    replacement: path.resolve(
                        __dirname,
                        './src/lib/three/build/three.module.js'
                    ),
                },
                {
                    find: 'three/addons/',
                    replacement: path.resolve(
                        __dirname,
                        './src/lib/three/examples/jsm/'
                    ),
                },
                {
                    find: 'three/nodes',
                    replacement: path.resolve(
                        __dirname,
                        './src/lib/three/examples/jsm/nodes/Nodes.js'
                    ),
                },
            ],
        }),
        resolve({
            browser: true,
            preferBuiltins: false,
        }),
        commonjs(),
        terser(),
    ],
}
