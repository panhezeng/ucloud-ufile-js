const path = require('path')
const BeforeRunWebpackPlugin = require('@panhezeng/before-run-webpack-plugin')

const config = {
  entry: './example/index.js',
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: 'example.js',
  },
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules|dist/,
        use: 'babel-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [],
  devServer: {}
}

module.exports = (env, argv) => {
  if (argv.mode === 'production') {
    config.plugins.push(new BeforeRunWebpackPlugin({sed: 'react'}))
  }
  return config
}

