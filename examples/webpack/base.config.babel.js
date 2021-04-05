import HtmlWebpackPlugin from 'html-webpack-plugin';
import { root } from './utils';

console.log('NODE_ENV =', process.env.NODE_ENV);

const nodeEnv = process.env.NODE_ENV;
const isDevEnv = nodeEnv === 'development';

const INCLUDE_PATTERNS = [/src/];

const config = (entries, outDir) => {
  const res = {
    mode: nodeEnv,

    entry: entries,

    output: {
      path: outDir || root('dist'),
      filename: isDevEnv ? `[name].bundle.js` : `[name].bundle.[chunkhash].js`,
    },

    devtool: isDevEnv ? 'source-map' : false,

    performance: { hints: false },

    module: {
      rules: [
        {
          test: /\.js$/,
          use: ['source-map-loader'],
          enforce: 'pre',
        },
        {
          test: /\.tsx?$/,
          include: INCLUDE_PATTERNS,
          use: [
            {
              loader: 'ts-loader',
            },
          ],
        },
        {
          test: /\.less$/,
          include: INCLUDE_PATTERNS,
          exclude: [/app.global.less$/, /antd.less$/],
          use: [
            {
              loader: 'style-loader',
            },
            {
              loader: 'typings-for-css-modules-loader',
              options: {
                modules: true,
                namedExport: true,
                camelCase: true,
                localIdentName: process.env.NODE_ENV === 'development' ? '[local]-[hash:base64:5]' : '[hash:base64:5]',
              },
            },
            {
              loader: 'less-loader',
            },
          ],
        },
      ],
    },

    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.less'],
    },

    plugins: [
      new HtmlWebpackPlugin({
        title: 'StateDecorator examples',
        template: 'src/index.html',
      }),
    ],
  };

  return res;
};

export default config;
