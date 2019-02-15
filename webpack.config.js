module.exports = {
  output: {
    filename: "ucloud-ufile.min.js",
    libraryTarget: "umd",
    umdNamedDefine: true,
    library: "UCloudUFile",
    libraryExport: "UCloudUFile"
  },
  externals: {
    "spark-md5": {
      commonjs: "spark-md5",
      commonjs2: "spark-md5",
      amd: "spark-md5",
      root: "SparkMD5"
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: "babel-loader"
      }
    ]
  }
};
