import { DEFAULT_EXTENSIONS } from '@babel/core';
import babel from 'rollup-plugin-babel';
import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: './src/StateDecorator.tsx',
  output: [
    {
      format: 'cjs',
      file: 'dist/index.js',
      sourcemap: true,
      exports: 'named',
    },
    {
      format: 'es',
      file: 'dist/index.es.js',
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
    commonjs(),
  ],
};
