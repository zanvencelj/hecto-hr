const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

const root = join(__dirname, '../..');

module.exports = {
  // Explicit entry prevents webpack from adding its default 'main: ./src' entry
  // when NxAppWebpackPlugin changes the output name to 'worker'.
  entry: {
    worker: join(__dirname, 'src/worker.ts'),
  },
  resolve: {
    alias: {
      '@hecto/shared-types': join(root, 'libs/shared/types/src/index.ts'),
      '@hecto/database': join(root, 'libs/backend/database/src/index.ts'),
      '@hecto/users': join(root, 'libs/backend/users/src/index.ts'),
      '@hecto/auth': join(root, 'libs/backend/auth/src/index.ts'),
      '@hecto/mail': join(root, 'libs/backend/mail/src/index.ts'),
      '@hecto/queue': join(root, 'libs/backend/queue/src/index.ts'),
      '@hecto/storage': join(root, 'libs/backend/storage/src/index.ts'),
      '@hecto/employees': join(root, 'libs/backend/employees/src/index.ts'),
      '@hecto/shifts': join(root, 'libs/backend/shifts/src/index.ts'),
      '@hecto/leave': join(root, 'libs/backend/leave/src/index.ts'),
      '@hecto/company-settings': join(root, 'libs/backend/company-settings/src/index.ts'),
    },
  },
  output: {
    path: join(__dirname, 'dist'),
    // Do not clean — main.js (built by the API target) must survive
    clean: false,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/worker.ts',
      outputFileName: 'worker.js',
      tsConfig: './tsconfig.app.json',
      assets: [],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
    }),
  ],
};
