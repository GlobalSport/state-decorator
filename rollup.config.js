import config from './rollup/base.config';

export default [
  config('./src/impl.ts', 'impl', []),
  config('./src/helpers.ts', 'helpers', []),
  config('./src/index.ts', 'index', ['./impl']),
  config('./src/middlewares.ts', 'middlewares', ['./impl']),
  config('./src/test.ts', 'test', ['./impl', 'jest']),
  config('./src/v5.ts', 'v5', ['./index', './impl', './middlewares']),
  config('./src/v5_test.ts', 'v5_test', ['./index', './impl']),
];
