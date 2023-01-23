import config from './rollup/base.config';

export default [config('./src/development.ts', 'development', ['./impl'])];
