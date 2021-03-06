const fs = require("fs");
const path = require('path');
const chokidar = require("chokidar");
const fg = require("fast-glob");
const writer = require("./writer");
const log = require("./log");

module.exports = function (options) {
    const elev = this;
    const inputDir = elev.inputDir;
    const outputDir = elev.outputDir;
    const defaultOptions = {
        src: path.join(inputDir, "**/*.css"),
        excludeNodeModules: true,
        dest: ".",
        keepFolderStructure: true,
        configFile: "tailwind.config.js",
        autoprefixer: true,
        autoprefixerOptions: {},
        minify: true,
        minifyOptions: {}
    }

    options = { ...defaultOptions, ...options, inputDir, outputDir };
    options.dest = path.join(outputDir, options.dest);
    if (!fs.existsSync(options.configFile)) {
        options.configFile = undefined;
    } else {
        log("Using Tailwind config file from " + options.configFile);
    }

    let excludeGlob = [options.dest, "**/!(*.css)"];
    if (options.excludeNodeModules) {
        excludeGlob.push("node_modules/**/*");
    }

    const watchList = fg.sync(options.src, {
        ignore: excludeGlob
    });
    
    const fileNames = watchList.map((src) => {
        let baseName = path.basename(src);
        let subDir = "";
        if (options.keepFolderStructure) {
            let pathToFile = path.relative(options.inputDir, path.dirname(src));
            if (pathToFile !== "") {
                subDir = pathToFile.replace(/^\.\.\/?/, "");
            }
        }
        let dest = path.join(options.dest, subDir, baseName);
        return [src, dest];
    });

    writer(fileNames, options).then(() => {
        const argv = process.argv.slice(2);
        const isWatch = argv.includes("--watch");
        const isServe = argv.includes("--serve");
        if (isWatch || isServe) {
            const watcher = chokidar.watch(watchList);
            watcher.on("change", (path) => {
                log("File changed: " + path);
                writer(fileNames, options).then(() => {
                    if (isServe) {
                        elev.eleventyServe.reload();
                    }
                    console.log("Watching…");
                });
            });
        }
    });

};