import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(distDir)) {
  console.error('Directory dist does not exist. Run npm run build first.');
  process.exit(1);
}

const htmlFile = path.join(distDir, 'index.html');
let htmlContent = fs.readFileSync(htmlFile, 'utf-8');

const assetFiles = fs.readdirSync(assetsDir);
const cssFile = assetFiles.find(f => f.endsWith('.css'));
const jsFile = assetFiles.find(f => f.endsWith('.js'));

if (cssFile) {
  const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
  // Replace link stylesheet with inline style using function to prevent $ replacement issues
  htmlContent = htmlContent.replace(
    new RegExp(`<link[^>]*href="[^"]*${cssFile}"[^>]*>`, 'i'),
    () => `<style>\n${cssContent}\n</style>`
  );
}

if (jsFile) {
  const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
  // Replace module script with inline module script using function to prevent $ token corruption in minified JS
  htmlContent = htmlContent.replace(
    new RegExp(`<script[^>]*src="[^"]*${jsFile}"[^>]*>\\s*</script>`, 'i'),
    () => `<script type="module">\n${jsContent}\n</script>`
  );
}

// Also ensure base path is relative
htmlContent = htmlContent.replace(/href="\//g, 'href="./');
htmlContent = htmlContent.replace(/src="\//g, 'src="./');

const standaloneOutput = path.join(distDir, 'sikutang_wms_standalone.html');
fs.writeFileSync(standaloneOutput, htmlContent, 'utf-8');

const publicOutput = path.join(path.resolve('public'), 'sikutang_wms_standalone.html');
fs.writeFileSync(publicOutput, htmlContent, 'utf-8');

console.log(`✅ File HTML Standalone berhasil dibuat: ${standaloneOutput} & ${publicOutput}`);
console.log(`Ukuran file: ${(fs.statSync(standaloneOutput).size / (1024 * 1024)).toFixed(2)} MB`);
