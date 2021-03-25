import config from './rollup/base.config';

export default [
  config('./src/index.ts', './dist/index', ['./impl']),
  config('./src/middlewares.ts', 'dist/middlewares'),
  config('./src/test.ts', 'dist/test', ['./impl', 'jest']),
  config('./src/v5.ts', 'dist/v5', ['./index', './impl', './middlewares']),
];
