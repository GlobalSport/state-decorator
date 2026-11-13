import config from './rolldown/base.config.mjs';

export default [
  config('./src/impl.ts', 'impl', []),
  config('./src/middlewares.ts', 'middlewares', ['./impl']),
  config('./src/development.ts', 'development', ['./impl']),
  config('./src/helpers.ts', 'helpers', []),
  config('./src/index.ts', 'index', ['./impl', './development']),
  config('./src/test.ts', 'test', ['./impl', 'jest']),
];
