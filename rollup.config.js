import config from './rollup/base.config';

export default [
  config('./src/index.ts', './dist/index'),
  config('./src/middlewares.ts', 'dist/middlewares'),
  config('./src/test.ts', 'dist/test', ['./index', 'jest']),
  config('./src/v5.ts', 'dist/v5', ['./index', './middlewares']),
];
