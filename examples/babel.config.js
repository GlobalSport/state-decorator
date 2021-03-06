const snakeCase = require('lodash/snakeCase');

const babelConfig = (api) => {
  if (api.env('test')) {
    return {
      presets: [
        [
          '@babel/env',
          {
            targets: {
              node: '10',
            },
          },
        ],
        '@babel/react',
        '@babel/preset-typescript',
      ],
      plugins: [
        '@babel/plugin-proposal-object-rest-spread',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator',
        'babel-plugin-transform-es2015-modules-commonjs',
      ],
    };
  }

  return {
    presets: [['@babel/env'], '@babel/react', '@babel/preset-typescript'],
    plugins: [
      '@babel/plugin-proposal-object-rest-spread',
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
    ],
  };
};

module.exports = babelConfig;
