const fs = require("fs");
const path = require("path");
const parse = require("node-html-parser").parse;
const glob = require("glob");

/**
 * Look ma, it's cp -R.
 * @param {string} src  The path to the thing to copy.
 * @param {string} dest The path to the new copy.
 */
function copyRecursiveSync(src, dest) {
    var exists = fs.existsSync(src);
    var stats = exists && fs.statSync(src);
    var isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(function (childItemName) {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

fs.rmdirSync(__dirname + "/dist", { recursive: true });
copyRecursiveSync(__dirname + "/web", __dirname + "/dist");

glob(__dirname + "/dist/**/*.html", {}, (err, files) => {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        fs.readFile(file, "utf8", (err, html) => {
            if (err) {
                throw err;
            }

            const root = parse(html);

            const shynetNoscript = parse('<noscript><img src="' + process.env.SHYNET_PIXEL_SRC + '"></noscript>');
            const shynetScript = parse('<script defer src="' + process.env.SHYNET_SCRIPT_SRC + '"></script>');
            const body = root.querySelector("body");
            body.appendChild(shynetNoscript);
            body.appendChild(shynetScript);

            fs.writeFileSync(file, root.toString());
        });
    }
});
