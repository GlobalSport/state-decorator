const isProd = process.env.NODE_ENV === 'production';

export default function (input, file, externals = []) {
  return {
    input: input,
    output: {
      format: 'es',
      file: `./lib/${file}.js`,
      sourcemap: true,
      minify: isProd,
    },
    platform: 'node',
    external: ['react', 'react-dom', ...externals],
    treeshake: {
      moduleSideEffects: false,
    },
    transform: {
      target: 'esnext',
    },
  };
}
