const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

const nextraConfig = withNextra({});

module.exports = {
  ...nextraConfig,
  images: {
    unoptimized: true,
  },
  webpack: (config, context) => {
    const baseConfig = nextraConfig.webpack(config, context);

    if (context.dev) {
      baseConfig.devtool = 'source-map';

      baseConfig.module.rules.push({
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      });
      baseConfig.ignoreWarnings = [/Failed to parse source map/];
    }
    if (!context.isServer) {
      config.plugins.push(new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        analyzerPort: context.isServer ? 8888 : 8889,
        reportFilename: './analyze/server.html',
        openAnalyzer: process.env.ANALYZER === 'true',
      }));
    }

    baseConfig.devServer = {
      ...baseConfig.devServer,
      port: 'auto',
    }

    return baseConfig;
  },
};
