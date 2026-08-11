const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

const dirsToCopy = ['js', 'css', 'Patentes', 'assets', 'telas'];
const filesToCopy = ['index.html', 'mobile.html', 'manifest.json', 'sw.js', 'funcionario.js', 'admin.js', 'core.js', 'auth.js', 'calendario.js', 'config.js'];

function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    const isDirectory = stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

dirsToCopy.forEach(dir => {
    console.log(`Copiando diretorio: ${dir}`);
    copyRecursiveSync(path.join(__dirname, dir), path.join(distDir, dir));
});

filesToCopy.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`Copiando arquivo: ${file}`);
        fs.copyFileSync(path.join(__dirname, file), path.join(distDir, file));
    }
});

console.log('Pasta dist preparada com sucesso!');
