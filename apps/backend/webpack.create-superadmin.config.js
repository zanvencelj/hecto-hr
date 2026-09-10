const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

const root = join(__dirname, '../..');

module.exports = {
  entry: {
    'create-superadmin': join(__dirname, 'src/seed/create-superadmin.ts'),
  },
  resolve: {
    alias: {
      '@hecto/shared-types': join(root, 'libs/shared/types/src/index.ts'),
      '@hecto/database': join(root, 'libs/backend/database/src/index.ts'),
    },
  },
  output: {
    path: join(__dirname, 'dist'),
    // Do not clean — main.js/worker.js/seed.js (built by other targets) must survive
    clean: false,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/seed/create-superadmin.ts',
      outputFileName: 'create-superadmin.js',
      tsConfig: './tsconfig.app.json',
      assets: [],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
    }),
  ],
};
