const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  entry: {
    mainCjs: path.join(__dirname, "app", "main-commonjs.js")
  },
  output: {
    path: path.join(__dirname, "build")
  },
  devtool: false,
  externals: [nodeExternals()],
  optimization: {
    runtimeChunk: {
      name: 'runtimeChunk'
    }
  },
  mode: 'development'
};
