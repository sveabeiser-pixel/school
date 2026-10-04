const fs = require('node:fs');
const path = require('node:path');
const modules = process.argv[2];
if (!modules) throw new Error('Pass the dependency node_modules directory.');
const root = path.resolve(__dirname, '..');
const vendor = path.join(root, 'informatik/vendor');
fs.mkdirSync(vendor, { recursive: true });
require(path.join(modules, 'esbuild')).buildSync({
  entryPoints: [path.join(root, 'informatik/ki3-libraries.js')],
  outfile: path.join(vendor, 'ki3-libraries.bundle.js'),
  nodePaths: [modules], bundle: true, format: 'iife', minify: true,
  legalComments: 'linked', target: ['chrome90', 'firefox90', 'safari15']
});
const notices = [];
for (const name of fs.readdirSync(modules)) {
  if (name.startsWith('.') || name.startsWith('@') || name === 'esbuild') continue;
  const dir = path.join(modules, name);
  if (!fs.existsSync(path.join(dir, 'package.json'))) continue;
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const license = fs.readdirSync(dir).find(file => /^licen[sc]e(\.|$)/i.test(file));
  if (license) notices.push(`${pkg.name} ${pkg.version}\n${JSON.stringify(pkg.repository || '')}\n\n${fs.readFileSync(path.join(dir, license), 'utf8')}`);
}
fs.writeFileSync(path.join(vendor, 'ki3-LICENSES.txt'), notices.join('\n\n========================================\n\n'), 'utf8');
console.log('Built KI3 libraries and license notices.');
