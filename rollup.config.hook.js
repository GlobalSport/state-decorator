import { DEFAULT_EXTENSIONS } from '@babel/core';
import babel from 'rollup-plugin-babel';
import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import visualizer from 'rollup-plugin-visualizer';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: './src/useStateDecorator/index.ts',
  output: [
    {
      format: 'cjs',
      file: 'dist/hook/index.js',
      sourcemap: true,
      exports: 'named',
    },
    {
      format: 'es',
      file: 'dist/hook/index.es.js',
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
    visualizer(),
  ],
};
