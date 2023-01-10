import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { visualizer } from 'rollup-plugin-visualizer';
import { terser } from 'rollup-plugin-terser';

import stripBanner from 'rollup-plugin-strip-banner';

const isProd = false; // process.env.NODE_ENV === 'production';
const isAnalyze = process.env.NODE_ENV === 'analyze';

export default function (input, file, externals = []) {
  return {
    input: input,
    output: [
      {
        format: 'cjs',
        file: `./lib/${file}.js`,
        sourcemap: true,
        exports: 'named',
      },
      {
        format: 'es',
        file: `./lib/es/${file}.js`,
        sourcemap: true,
      },
    ],
    external: ['react', 'react-dom', ...externals],
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        typescript: require('typescript'),
      }),
      isProd ? stripBanner() : null,
      isProd ? terser() : null,
      isAnalyze ? visualizer({ open: true }) : null,
    ].filter((c) => c),
  };
}
