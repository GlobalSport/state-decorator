import config from './rollup/base.config';

export default [config('./src/index.ts', './dist/index'), config('./src/compat.ts', './dist/compat')];
