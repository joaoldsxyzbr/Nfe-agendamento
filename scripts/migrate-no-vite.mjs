import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
let changed = 0;
async function edit(path, change) {
  const full = join(root, path);
  const prev = await readFile(full, 'utf8');
  const next = change(prev);
  if (prev !== next) { await writeFile(full, next, 'utf8'); changed++; }
}
async function walk(dir) {
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) await walk(child);
    else if (entry.isFile() && extname(child) === '.js') {
      await edit(child, (prev) => {
        let next = prev;
        if (child === 'apps/web/src/nfe/xml.js' || child === 'apps/web/src/nfe/rtc.js') {
          const importLine = "import { DOMParser } from '@xmldom/xmldom';\n";
          if (!next.startsWith(importLine)) throw new Error('Import do parser ausente em ' + child);
          next = next.slice(importLine.length);
          next = next.replace(
            'if (!document || parseErrors.length > 0) {',
            "if (!document || parseErrors.length > 0 || document.getElementsByTagName('parsererror').length > 0) {"
          );
        }
        next = next.replace(/^\s*import\s+['"][^'"]+\.css['"];\r?\n/gm, '\n');
        next = next.replace(/\b(from\s*|import\s*\(\s*|import\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,
          (full, prefix, quote, value) => extname(value.split(/[?#]/)[0]) ? full : prefix + quote + value + '.js' + quote);
        return next;
      });
    }
  }
}
await walk('apps/web/src');
await edit('apps/web/index.html', (s) => {
  const old = '    <link rel="stylesheet" href="/src/brand.css" />';
  if (!s.includes(old)) throw new Error('Link CSS não localizado');
  return s.replace(old, old + '\n' + [
    '    <link rel="stylesheet" href="/src/styles.css" />',
    '    <link rel="stylesheet" href="/src/batch.css" />',
    '    <link rel="stylesheet" href="/src/danfe/styles.css" />',
    '    <link rel="stylesheet" href="/src/settings-panel.css" />',
  ].join('\n'));
});
await edit('apps/web/package.json', (s) => {
  const pkg = JSON.parse(s);
  pkg.scripts.build = 'node ../../scripts/build-web.mjs';
  pkg.scripts.dev = 'node ../../scripts/serve-web.mjs --source';
  delete pkg.devDependencies.vite;
  pkg.devDependencies['@xmldom/xmldom'] = pkg.dependencies['@xmldom/xmldom'];
  delete pkg.dependencies['@xmldom/xmldom'];
  if (!Object.keys(pkg.dependencies).length) delete pkg.dependencies;
  return JSON.stringify(pkg, null, 2) + '\n';
});
await edit('apps/web/vitest.config.js', (s) => s.replace(
  '    test: {',
  "    test: {\n        setupFiles: ['../../scripts/setup-dom-parser.mjs'],"
));
await edit('scripts/lint-web.mjs', (s) => s.replace(", join(webRoot, 'vite.config.js')", ''));
await edit('tests/playwright/playwright.config.js', (s) => {
  const old = 'npm --workspace @nfe-agendamento/web run dev -- --host 127.0.0.1 --port 4173';
  if (!s.includes(old)) throw new Error('Playwright webServer inesperado');
  return s.replace(old, 'npm run build:web && node scripts/serve-web.mjs --dist --host 127.0.0.1 --port 4173');
});
await edit('apps/web/tests/extension-only-smoke.test.js', (s) => {
  const old = "const viteConfigUrl = new URL('../vite.config.js', import.meta.url);";
  if (!s.includes(old)) throw new Error('Teste smoke sem Vite anchor');
  return s.replace(old,
      "const buildScriptUrl = new URL('../../../scripts/build-web.mjs', import.meta.url);")
    .replace("const viteConfig = readFileSync(viteConfigUrl, 'utf8');",
      "const buildScript = readFileSync(buildScriptUrl, 'utf8');")
    .replace("expect(viteConfig).toContain('extension-test.html');",
      "expect(buildScript).toContain('extension-test.html');");
});
await edit('apps/web/tests/deploy-config.test.js', (s) =>
  s.replace("const ciUrl = new URL('../../../.github/workflows/ci.yml', import.meta.url);",
    "const ciUrl = new URL('../../../.github/workflows/ci.yml', import.meta.url);\nconst buildScriptUrl = new URL('../../../scripts/build-web.mjs', import.meta.url);")
   .replace("expect(config.assets?.directory).toBe('./apps/web/dist');",
     "expect(config.assets?.directory).toBe('./apps/web/dist');\n        const staticBuild = await readFile(buildScriptUrl, 'utf8');\n        expect(staticBuild).toContain(\"new URL('src/', web)\");\n        await expect(access(new URL('../vite.config.js', import.meta.url))).rejects.toBeDefined();")
);
await edit('README.md', (s) => s
 .replace('Vite, Vitest, Playwright, esbuild e Wrangler continuam como ferramentas de build e testes.',
  'O site usa módulos JavaScript nativos, com CSS carregado pelo HTML, sem Vite nem bundler frontend. Um script Node.js apenas copia arquivos para apps/web/dist. Vitest e Playwright testam; esbuild empacota somente a extensão Chromium; Wrangler publica o site.')
 .replace('Detalhes: docs/architecture/javascript-migration.md.',
  'Detalhes: docs/architecture/javascript-migration.md e docs/architecture/site-estatico-sem-vite.md.')
 .replace('npm run build:web\n', 'npm run build:web\nnpm --workspace @nfe-agendamento/web run dev\n')
 .replaceAll('typecheck/lint', 'lint/sintaxe'));
await edit('docs/README.md', (s) => s.replace(
  'Decisão de stack: docs/architecture/javascript-migration.md.',
  'Decisão de stack: docs/architecture/javascript-migration.md e docs/architecture/site-estatico-sem-vite.md.'
));
await edit('docs/architecture/javascript-migration.md', (s) => s +
  '\n## Evolução: site sem Vite\n\nA decisão original preservava Vite. O site passou a usar módulos JavaScript nativos, CSS linkado pelo HTML e build de cópia. A extensão mantém esbuild apenas para empacotamento de scripts Manifest V3. Veja docs/architecture/site-estatico-sem-vite.md.\n'
);
await edit('AGENTS.md', (s) => s.replace(
  '- A aplicação atual utiliza JavaScript ES Modules, HTML e CSS. Evite reintroduzir TypeScript ou outra linguagem de código.',
  '- A aplicação atual utiliza JavaScript ES Modules, HTML e CSS puros, sem Vite, React ou bundler de site. Evite reintroduzir TypeScript ou outra linguagem de código.\n- Scripts Node.js são permitidos para copiar arquivos e empacotar a extensão; não introduzir frameworks do frontend sem autorização.'
));
await writeFile(join(root, 'scripts/setup-dom-parser.mjs'),
  "import { DOMParser } from '@xmldom/xmldom';\n// Polyfill exclusivo dos testes Node; browsers usam DOMParser nativo.\nglobalThis.DOMParser = DOMParser;\n"
);
await writeFile(join(root, 'docs/architecture/site-estatico-sem-vite.md'), [
  '# Site estático sem Vite',
  '',
  'Data: 2026-10-15. Complementa javascript-migration.md.',
  '',
  '## Arquitetura',
  '',
  '- HTML, CSS e JavaScript ES Modules nativos no site. Sem bundler ou transpiler frontend.',
  '- Imports relativos possuem extensão .js; arquivos CSS são ligados em index.html.',
  '- scripts/build-web.mjs copia index.html, extension-test.html, src/ e public/ para apps/web/dist.',
  '- scripts/serve-web.mjs --source serve arquivos em desenvolvimento; --dist serve os artefatos de teste.',
  '- Cloudflare Workers Static Assets continua publicando exclusivamente apps/web/dist.',
  '- XML usa DOMParser nativo do navegador. @xmldom/xmldom é usado apenas como polyfill nos testes Node.',
  '',
  '## Extensão e testes',
  '',
  '- A extensão continua em JavaScript e HTML. esbuild empacota seus scripts Chromium MV3, sem alterar sua lógica.',
  '- Vitest e suas dependências internas, Playwright e Wrangler são ferramentas de teste/entrega, não runtime do site.',
  '- Preservar lint, audit, testes, cobertura, builds, Playwright e dry-run Cloudflare no CI.',
  '- Fluxo fiscal Portal Nacional, hCaptcha manual, certificado navegador, XML, lote e DANFE inalterados.',
  '',
  '## Validação',
  '',
  '- Exigir CI verde e teste Playwright na cópia estática publicada.',
  '- Aceite físico Chrome/Edge requer teste real no Portal pelo usuário e não é substituído por CI.',
  '',
].join('\n'));
await rm(join(root, 'apps/web/vite.config.js'));
await rm(join(root, 'scripts/migrate-no-vite.mjs'));
await rm(join(root, '.github/workflows/migrate-no-vite.yml'));
console.info('Migração local preparada: ' + changed + ' arquivos atualizados.');
