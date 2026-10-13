const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const excludedDirectories = new Set(['.git', '.codex', '.agents', 'node_modules', 'assets', 'public', 'legacy_dont_read']);

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map(match => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4]]));
}

function metadata(html) {
  const result = {};
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(tag[0]);
    if (attrs.name) result[attrs.name] = attrs.content;
  }
  return result;
}

function taskIds(html) {
  const ids = new Set();
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = attributes(match[1]);
    if (!String(attrs.class || '').split(/\s+/).includes('wb-config')) continue;
    const cfg = JSON.parse(match[2]);
    if (cfg.id) ids.add(String(cfg.id));
  }
  let pairIndex = 0;
  for (const match of html.matchAll(/<[^>]+\bdata-p2(?:\s|=|>)[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    ids.add(attrs['data-p2-id'] || attrs.id || `p2_${pairIndex}`);
    pairIndex++;
  }
  return ids;
}

function solutionIds(html) {
  const ids = new Set();
  for (const tag of html.matchAll(/<[^>]+\bdata-solution\s*=[^>]*>/gi)) {
    const attrs = attributes(tag[0]);
    if (attrs['data-solution']) ids.add(attrs['data-solution']);
  }
  return ids;
}

function htmlFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && !excludedDirectories.has(entry.name)) files.push(...htmlFiles(path.join(directory, entry.name)));
    else if (entry.isFile() && /\.html?$/i.test(entry.name)) files.push(path.join(directory, entry.name));
  }
  return files;
}

function check(rootDirectory, requestedSource) {
  const root = path.resolve(rootDirectory);
  const requested = requestedSource ? path.resolve(root, requestedSource) : null;
  const issues = [];
  const solutionsBySource = new Map();
  const files = htmlFiles(root);
  const relative = filename => path.relative(root, filename).replaceAll('\\', '/');
  const read = filename => fs.readFileSync(filename, 'utf8');
  const exceptionsPath = path.join(root, 'scripts', 'musterloesungen-ausnahmen.json');
  const exceptions = fs.existsSync(exceptionsPath) ? JSON.parse(read(exceptionsPath)) : {};
  const excepted = filename => Object.hasOwn(exceptions, relative(filename));
  let checked = 0;

  for (const file of files) {
    const html = read(file);
    const meta = metadata(html);
    if (!meta['musterloesung-source']) continue;
    const source = path.resolve(path.dirname(file), meta['musterloesung-source']);
    if (requested && source !== requested) continue;
    checked++;
    if (!source.startsWith(root + path.sep) || !fs.existsSync(source)) {
      issues.push(`${relative(file)}: Lernseite fehlt oder liegt außerhalb des Projekts.`);
      continue;
    }
    const paired = solutionsBySource.get(source) || [];
    paired.push(file);
    solutionsBySource.set(source, paired);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
    if (String(meta['musterloesung-source-sha256'] || '').toLowerCase() !== digest) {
      issues.push(`${relative(file)}: Lernseite wurde geändert; Musterlösung fachlich prüfen und aktualisieren.`);
    }
    try {
      const expected = taskIds(read(source));
      const actual = solutionIds(html);
      const missing = [...expected].filter(id => !actual.has(id));
      if (missing.length) issues.push(`${relative(file)}: Lösungen fehlen für ${missing.join(', ')}.`);
    } catch (error) {
      issues.push(`${relative(source)}: Aufgabenkonfiguration ist ungültig (${error.message}).`);
    }
  }

  for (const [source, solutions] of solutionsBySource) {
    if (solutions.length > 1) issues.push(`${relative(source)}: Mehrere Musterlösungen zugeordnet: ${solutions.map(relative).join(', ')}.`);
  }

  const indexPath = path.join(root, 'index.html');
  if (fs.existsSync(indexPath) && fs.existsSync(path.join(root, 'scripts', 'lernseiten-links.json'))) {
    const links = new Set([...read(indexPath).matchAll(/<a\b[^>]*>/gi)].map(match => attributes(match[0]).href));
    for (const [source, solutions] of solutionsBySource) {
      if (!links.has(relative(source))) issues.push(`index.html: Link zur Lernseite ${relative(source)} fehlt.`);
      for (const solution of solutions) {
        if (!links.has(relative(solution))) issues.push(`index.html: Link zur Musterlösung ${relative(solution)} fehlt.`);
      }
    }
  }

  for (const file of files) {
    if (requested && file !== requested) continue;
    if (excepted(file) || solutionsBySource.has(file)) continue;
    const html = read(file);
    if (metadata(html)['musterloesung-source']) continue;
    try {
      if (taskIds(html).size) issues.push(`${relative(file)}: Keine Musterlösung zugeordnet.`);
    } catch (error) {
      issues.push(`${relative(file)}: Aufgabenkonfiguration ist ungültig (${error.message}).`);
    }
  }
  return { checked, issues };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const sourceIndex = args.indexOf('--source');
  if (args.length && (sourceIndex !== 0 || args.length !== 2)) {
    console.error('Aufruf: node scripts/check-musterloesungen.cjs [--source ordner/lernseite.html]');
    process.exitCode = 2;
  } else {
    const result = check(path.resolve(__dirname, '..'), args[sourceIndex + 1]);
    for (const issue of result.issues) console.error(issue);
    console.log(`${result.checked} Musterlösungen geprüft; ${result.issues.length} Probleme.`);
    process.exitCode = result.issues.length ? 1 : 0;
  }
}

module.exports = { check, metadata, taskIds, solutionIds };
