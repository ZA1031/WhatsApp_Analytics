// webpack.worker.config.js
const path = require("path");

module.exports = {
  entry: "./app/WorkerApp.ts", // Adjust this path based on your structure
  target: "webworker", // ← Very important
  mode: "production",
  output: {
    filename: "WorkerApp.bundle.js", // Output single bundled file
    path: path.resolve(__dirname, "dist_web/assets"), // Put in same folder as other assets
    publicPath: "/assets",
    clean: false,
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "@app": path.resolve(__dirname, "app"),
      "@pipeline": path.resolve(__dirname, "pipeline"),
      "@report": path.resolve(__dirname, "report"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: { configFile: "tsconfig.web.json" },
      },
    ],
  },
  optimization: {
    splitChunks: false, // Prevent splitting vendor code
  },
};