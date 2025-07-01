// filepath: /D:/Work2/chat-analytics/webpack.main.config.js
const path = require("path");

module.exports = {
    target: "electron-main",
    devServer: {
        port: 3000,
        hot: true,
        static: {
            directory: path.join(__dirname, "dist_web")
        }
    },
    mode: "production", // Change to "development" for debugging
    entry: {
        main: "./electron/main.ts",
        preload: "./electron/preload.ts",  // <--- ADD THIS
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            "@pipeline": path.resolve(__dirname, "lib/pipeline/"),
            "@report": path.resolve(__dirname, "lib/report/"),
            "@lib": path.resolve(__dirname, "lib/"),
        },
        fallback: {
            fs: false,
            path: false,
            crypto: false,
        },
    },
    externals: {
        "electron-reload": "commonjs electron-reload", // Exclude electron-reload from bundling
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
};