import { DEFAULT_EXTENSIONS } from '@babel/core';
import babel from '@rollup/plugin-babel';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import visualizer from 'rollup-plugin-visualizer';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default function (input, outDir, externals = []) {
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
    external: ['react', 'react-dom', ...externals],
    plugins: [
      typescript({}),
      babel({
        extensions: [...DEFAULT_EXTENSIONS, 'ts', 'tsx'],
        exclude: './node_modules/**',
        babelHelpers: 'runtime',
      }),
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      terser(),
      // visualizer(),
    ],
  };
}
