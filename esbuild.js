const esbuild = require("esbuild");
const fs = require("fs"); // File system module for copying
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',

    setup(build) {
        build.onStart(() => {
            console.log('[watch] build started');
        });
        build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
            });
            console.log('[watch] build finished');
        });
    },
};

async function main() {
    const optionsExtension = {
        entryPoints: ['src/extension.ts'],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'node',
        outfile: 'dist/extension.js',
        external: ['vscode'], // Don't mark 'ws' as external
        logLevel: 'silent',
        plugins: [esbuildProblemMatcherPlugin],
    };

    const optionsWebview = {
        entryPoints: ['src/webview.js'], // WebView JS entry point
        bundle: true,
        format: 'iife', // Immediately Invoked Function Expression for browsers
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'browser',
        outfile: 'dist/webview.js', // Output file for webview.js
        logLevel: 'silent',
    };

    // Copy CSS to dist folder
    const copyCss = () => {
        const srcPath = path.join(__dirname, 'src', 'webview.css');
        const destPath = path.join(__dirname, 'dist', 'webview.css');

        try {
            fs.copyFileSync(srcPath, destPath);
            console.log('[CSS] Copied webview.css to dist');
        } catch (err) {
            console.error(`[CSS] Failed to copy webview.css: ${err}`);
        }
    };

    if (watch) {
        const tasks = [
            esbuild.build({ ...optionsExtension, watch: true }),
            esbuild.build({ ...optionsWebview, watch: true }),
        ];

        tasks.forEach(async (task) => {
            const context = await task;
            context.watch({
                onRebuild(error, result) {
                    if (error) {
                        console.error('watch build failed:', error);
                    } else {
                        console.log('watch build succeeded:', result);
                        copyCss();
                    }
                },
            });
        });
    } else {
        await Promise.all([esbuild.build(optionsExtension), esbuild.build(optionsWebview)]);
        copyCss();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
