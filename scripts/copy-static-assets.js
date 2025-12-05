const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'public');
const destDir = path.resolve(__dirname, '..', 'web-build');

const copyRecursive = (source, destination) => {
  if (!fs.existsSync(source)) {
    return;
  }
  const stats = fs.statSync(source);
  if (stats.isDirectory()) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
  } else {
    const parentDir = path.dirname(destination);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(source, destination);
  }
};

if (!fs.existsSync(destDir)) {
  console.warn('web-build ディレクトリがまだ作成されていません。Expo export の後に実行してください。');
  process.exit(0);
}

copyRecursive(srcDir, destDir);
console.log(`Copied static assets from ${srcDir} to ${destDir}`);
