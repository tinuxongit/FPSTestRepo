import esbuild from 'esbuild';
import { mkdir, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const outdir = 'dist/assets';
await rm('dist', { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

const build = await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: `${outdir}/main.js`,
  format: 'esm',
  target: ['es2020'],
  external: ['three'],
  metafile: true,
});

const css = await readFile('styles/app.css', 'utf8');
const styleFiles = [...css.matchAll(/@import\s+["'](.+?)["'];?/g)].map(match => match[1]);
let bundledCss = '';
for (const file of styleFiles) bundledCss += await readFile(new URL(file, new URL('../styles/app.css', import.meta.url)), 'utf8') + '\n';
await writeFile(`${outdir}/app.css`, bundledCss);

let html = await readFile('index.html', 'utf8');
html = html.replace('./styles/app.css', './assets/app.css').replace('./src/main.js', './assets/main.js');
await writeFile('dist/index.html', html);
await writeFile('dist/.nojekyll', '');

const digest = createHash('sha256').update(JSON.stringify(build.metafile)).digest('hex').slice(0, 12);
await writeFile('dist/build.json', JSON.stringify({ digest, builtAt: new Date().toISOString() }, null, 2));
console.log(`Built Ashfall Horizon ${digest}`);
