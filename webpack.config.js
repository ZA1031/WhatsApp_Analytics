const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HTMLInlineCSSWebpackPlugin = require("html-inline-css-webpack-plugin").default;
const CircularDependencyPlugin = require("circular-dependency-plugin");

const resolve = (file) => path.resolve(__dirname, file);

const notInline = [/PlatformInstructions.tsx$/];

let commitHash = "unknown";
try {
    commitHash = require("child_process").execSync("git rev-parse --short HEAD").toString().trim();
} catch {
    console.log("Couldn't run git to get commit hash.");
}

let version = "?.?.?";
try {
    version = JSON.parse(fs.readFileSync(resolve("package.json"))).version;
} catch {
    console.log("Couldn't read package.json for version.");
}

module.exports = (env) => {
    const isProd = env.production === true;
    const isSelfhosted = process.env.SELF_HOSTED === "1";

    if (!isProd) console.log("⚙️ DEV BUILD");
    if (isSelfhosted) console.log("🏠 SELF HOSTED BUILD");

    return {
        target: "web",
        mode: isProd ? "production" : "development",
        entry: {
            app: resolve("app/index.tsx"),
            report: resolve("report/index.tsx"),
            reportWorker: resolve("report/WorkerReport.ts"),
        },
        output: {
            path: resolve("dist_web"),
            publicPath: isProd ? "./" : "/",  // Use './' for production, '/' for development
            // publicPath: "./",
            filename: "assets/[name].[contenthash:8].js",
            assetModuleFilename: "assets/[contenthash:8][ext]",
            // chunkFilename: "assets/[id].[contenthash:8].js", // ← Important!
            clean: true,
        },
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".jsx"],
            alias: {
                "@app": resolve("app/"),
                "@assets": resolve("assets/"),
                "@pipeline": resolve("pipeline/"),
                "@report": resolve("report/"),
            },
            fallback: {
                fs: false,
                path: false,
                crypto: false,
            },
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [MiniCssExtractPlugin.loader, "css-loader"],
                },
                {
                    test: /\.less$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        "css-loader",
                        {
                            loader: "postcss-loader",
                            options: {
                                postcssOptions: {
                                    plugins: [require("autoprefixer"), require("cssnano")],
                                },
                            },
                        },
                        {
                            loader: "less-loader",
                            options: { lessOptions: { javascriptEnabled: true } },
                        },
                    ],
                },
                {
                    test: /\.tsx?$/,
                    loader: "ts-loader",
                    exclude: /node_modules/,
                    options: { configFile: "tsconfig.web.json" },
                },
                {
                    test: /\.(svg|png|jpe?g|gif|mp4)$/,
                    type: "asset/resource",
                    issuer: { and: notInline },
                },
                {
                    test: /\.(svg|png|jpe?g|gif|mp4)$/,
                    type: "asset/inline",
                    parser: {
                        dataUrlCondition: { maxSize: 2 ** 16 },
                    },
                    issuer: { not: notInline },
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                chunks: ["app"],
                template: resolve("assets/app.html"),
                filename: "index.html",
                minify: isProd,
            }),
            new HtmlWebpackPlugin({
                chunks: isProd ? ["report", "reportWorker"] : ["report"],
                template: resolve("assets/report.html"),
                filename: "report.html",
                minify: isProd,
            }),
            new MiniCssExtractPlugin(isProd ? { filename: "assets/[name].[contenthash:8].css" } : undefined),
            new webpack.DefinePlugin({
                env: {
                    isProd: JSON.stringify(isProd),
                    isDev: JSON.stringify(!isProd),
                    isSelfHosted: JSON.stringify(isSelfhosted),
                    build: JSON.stringify({
                        commitHash,
                        version,
                        date: new Date().toISOString(),
                    }),
                },
            }),
            new CircularDependencyPlugin({
                exclude: /node_modules/, // Exclude node_modules
                failOnError: false, // Set to true to fail the build on circular dependencies
                allowAsyncCycles: false, // Disallow async cycles
                cwd: process.cwd(),
            }),
            new CopyPlugin({
                patterns: [
                    resolve("assets/public"),
                    { from: resolve("assets/fasttext"), to: "fasttext" },
                    { from: resolve("assets/data/models"), to: "data/models" },
                    { from: resolve("assets/data/text"), to: "data/text" },
                    { from: resolve("assets/data/emojis/emoji-data.json"), to: "data/emojis/emoji-data.json" },
                ],
            }),
            ...(isProd
                ? [
                      new HTMLInlineCSSWebpackPlugin({ filter: (f) => f.includes("report") }),
                      new InlineChunkHtmlPlugin([/report/]),
                      new InlineChunkHtmlPlugin([/reportWorker/]),
                  ]
                : []),
        ],
        optimization: {
            minimize: isProd,
        },
        devtool: isProd ? false : "source-map",
        devServer: {
            allowedHosts: "all",
            client: {
                webSocketURL: {
                    hostname: "127.0.0.1",
                    port: 3000, // Updated port
                    pathname: "/ws",
                },
            },
            port: 3000, // Updated port
            compress: true,
            historyApiFallback: true,
            hot: true,
        },
    };
};

// Plugin to inline matching JS chunks directly into HTML
class InlineChunkHtmlPlugin {
    constructor(tests) {
        this.tests = tests;
    }

    getInlinedTag(publicPath, assets, tag) {
        if (tag.tagName !== "script" || !tag.attributes?.src) return tag;

        const scriptName = publicPath ? tag.attributes.src.replace(publicPath, "") : tag.attributes.src;
        if (!this.tests.some((test) => scriptName.match(test))) return tag;

        const asset = assets[scriptName];
        if (!asset) return tag;

        const isWorker = scriptName.toLowerCase().includes("worker");
        return {
            tagName: "script",
            attributes: isWorker ? { type: "text/plain", id: "worker-script" } : {},
            innerHTML: asset.source(),
            closeTag: true,
        };
    }

    apply(compiler) {
        let publicPath = compiler.options.output.publicPath || "";
        if (publicPath && !publicPath.endsWith("/")) publicPath += "/";

        compiler.hooks.compilation.tap("InlineChunkHtmlPlugin", (compilation) => {
            const alterTags = HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups;
            alterTags.tap("InlineChunkHtmlPlugin", (assets) => {
                const tagMapper = (tag) => this.getInlinedTag(publicPath, compilation.assets, tag);
                assets.headTags = assets.headTags.map(tagMapper);
                assets.bodyTags = assets.bodyTags.map(tagMapper);
            });
        });
    }
}
