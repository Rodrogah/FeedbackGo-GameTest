const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const jsDir = path.join(__dirname, 'js');

async function build() {
    console.log('🚀 Iniciando processo de minificação de código...');
    
    const files = fs.readdirSync(jsDir);
    
    for (const file of files) {
        if (file.endsWith('.js') && !file.endsWith('.min.js')) {
            const filePath = path.join(jsDir, file);
            const minFilePath = path.join(jsDir, file.replace('.js', '.min.js'));
            const mapFilePath = minFilePath + '.map';
            
            console.log(`📦 Processando: ${file}`);
            
            try {
                const code = fs.readFileSync(filePath, 'utf8');
                
                const result = await minify(code, {
                    sourceMap: {
                        filename: file,
                        url: file.replace('.js', '.min.js.map')
                    },
                    compress: {
                        drop_console: false, // Mantém os consoles de erro/logs importantes
                        passes: 2
                    },
                    mangle: false // Desativado para não quebrar funções chamadas pelo HTML
                });
                
                if (result.code) {
                    fs.writeFileSync(minFilePath, result.code, 'utf8');
                    console.log(`✅ Minificado: ${path.basename(minFilePath)}`);
                }
                
                if (result.map) {
                    fs.writeFileSync(mapFilePath, result.map, 'utf8');
                    console.log(`🗺️  Source Map gerado: ${path.basename(mapFilePath)}`);
                }
            } catch (err) {
                console.error(`❌ Erro ao minificar ${file}:`, err);
            }
        }
    }
    console.log('🎉 Build completo!');
}

build();
