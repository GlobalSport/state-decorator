import { DEFAULT_EXTENSIONS } from '@babel/core';
import babel from 'rollup-plugin-babel';
import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import visualizer from 'rollup-plugin-visualizer';
import resolve from 'rollup-plugin-node-resolve';
// import { terser } from 'rollup-plugin-terser';

export default function(input, outDir) {
  return {
    input: input,
    output: [
      {
        format: 'cjs',
        file: outDir + '.js',
        sourcemap: true,
        exports: 'named',
      },
      {
        format: 'es',
        file: outDir + '.es.js',
        sourcemap: true,
      },
    ],
    external: ['react', 'react-dom'],
    plugins: [
      typescript(),
      babel({
        extensions: [...DEFAULT_EXTENSIONS, 'ts', 'tsx'],
        exclude: './node_modules/**',
      }),
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      // terser is doing some optims that is doing some crashes...
      // terser(),
      visualizer(),
    ],
  };
}
