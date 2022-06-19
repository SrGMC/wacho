const fs = require("fs");
const glob = require("glob");
const Mustache = require('mustache');
const parse = require("node-html-parser").parse;
const path = require("path");

var languages = {};

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

// Remove build files and create aditional files required
try {
    fs.rmSync(__dirname + "/dist", { recursive: true });
} catch (err) {
    console.warn(__dirname + "/dist not found. Skipping deletion...");
}
fs.mkdirSync(__dirname + "/dist");
copyRecursiveSync(__dirname + "/web/assets", __dirname + "/dist/assets");
copyRecursiveSync(__dirname + "/web/css", __dirname + "/dist/css");
copyRecursiveSync(__dirname + "/web/js", __dirname + "/dist/js");

// Load language files
fs.readdirSync(__dirname + "/web/lang/").forEach((file) => {
    let lang = file.split(".")[0];
    const data = fs.readFileSync(__dirname + "/web/lang/" + file, "utf-8")
    languages[lang] = JSON.parse(data.toString());
    languages[lang].lang = lang

    // Create language directories
    copyRecursiveSync(__dirname + "/web/html", __dirname + "/dist/" + lang);
});

for (let i = 0; i < Object.keys(languages).length; i++) {
    const lang = Object.keys(languages)[i];

    glob(__dirname + "/dist/" + lang + "/**/*.html", {}, (err, files) => {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
    
            fs.readFile(file, "utf8", (err, html) => {
                if (err) {
                    throw err;
                }
    
                const root = parse(html);
    
                const shynetNoscript = parse('<noscript><img src="' + process.env.SHYNET_PIXEL_SRC + '"></noscript>');
                const shynetScript = parse('<script defer src="' + process.env.SHYNET_SCRIPT_SRC + '"></script>');
    
                // const googleAdsAdScript = parse('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + process.env.GADS_CLIENT + '" crossorigin="anonymous"></script>');
                // const googleAdsAdLoad = parse('<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>');
                // const googleAdsAd = parse('<ins class="adsbygoogle" style="display: block; width: 100%; height: 90px" data-ad-client="' + process.env.GADS_CLIENT + '" data-ad-slot="' + process.env.GADS_SLOT + '" data-ad-format="auto" data-full-width-responsive="true"></ins>');
    
                const body = root.querySelector("body");
                body.appendChild(shynetNoscript);
                body.appendChild(shynetScript);
                // body.appendChild(googleAdsAdScript);
                // body.appendChild(googleAdsAdLoad);
    
                // const ads = root.querySelectorAll(".ad");
                // ads.forEach((ad) => {
                //     ad.appendChild(googleAdsAd);
                // })
                
                // Translate file
                var output = Mustache.render(root.toString(), languages[lang]);
    
                fs.writeFileSync(file, output);
            });
        }
    });
}
