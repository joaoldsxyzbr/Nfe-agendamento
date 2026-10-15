import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const ts = createRequire(process.env.RUNNER_TEMP + '/typescript5/package.json')('typescript');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let converted = 0;

async function update(path, fn) {
  const absolute = join(root, path);
  const before = await readFile(absolute, 'utf8');
  const after = fn(before);
  if (before !== after) await writeFile(absolute, after, 'utf8');
}

async function convert(path) {
  const absolute = join(root, path);
  if (path.endsWith('.d.ts')) {
    await rm(absolute);
    return;
  }
  const source = await readFile(absolute, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      removeComments: false,
    },
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error('Erro TS ao converter ' + path + ': ' + errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; '));
  const destination = absolute.slice(0, -3) + '.js';
  // Renomeia referências textuais de imports e arquivos utilizados por testes.
  await writeFile(destination, result.outputText.replace(/\.ts\b/g, '.js'), 'utf8');
  await rm(absolute);
  converted++;
}

async function walk(path) {
  for (const entry of await readdir(join(root, path), { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await walk(child);
    else if (entry.isFile() && entry.name.endsWith('.ts')) await convert(child);
  }
}

for (const path of [
  'apps/web/src', 'apps/web/tests',
  'apps/extension/src', 'apps/extension/tests',
  'tests/playwright',
]) await walk(path);
for (const path of [
  'apps/web/vite.config.ts', 'apps/web/vitest.config.ts',
  'apps/extension/vitest.config.ts',
]) await convert(path);

// Atualiza assertions estruturais para inspecionar JavaScript, não tipos TS apagados.
await update('apps/web/tests/batch-controller.test.js', (value) => value.replace(
  'let renderedRows: RenderedBatchRow[] = [];',
  'let renderedRows = [];',
));
await update('apps/web/tests/danfe.test.js', (value) => value
  .replaceAll('querySelector<HTMLElement>', 'querySelector')
  .replaceAll('querySelector<HTMLTableRowElement>', 'querySelector'));

await rm(join(root, 'apps/web/tsconfig.json'));
await rm(join(root, 'apps/extension/tsconfig.json'));

await update('apps/web/index.html', (s) => s.replaceAll('.ts"', '.js"'));
await update('apps/web/extension-test.html', (s) => s.replaceAll('.ts"', '.js"'));
await update('apps/extension/scripts/build.mjs', (s) => s.replace(/\.ts\b/g, '.js'));

await update('apps/web/package.json', (s) => {
  const obj = JSON.parse(s);
  obj.scripts.build = 'vite build';
  obj.scripts.lint = 'node ../../scripts/lint-web.mjs';
  delete obj.devDependencies.typescript;
  delete obj.devDependencies['@types/node'];
  return JSON.stringify(obj, null, 2) + '\n';
});
await update('apps/extension/package.json', (s) => {
  const obj = JSON.parse(s);
  obj.scripts.build = 'node scripts/build.mjs';
  delete obj.scripts.typecheck;
  delete obj.devDependencies.typescript;
  return JSON.stringify(obj, null, 2) + '\n';
});
await update('tests/playwright/package.json', (s) => {
  const obj = JSON.parse(s);
  obj.scripts.test = 'playwright test --config=playwright.config.js';
  return JSON.stringify(obj, null, 2) + '\n';
});

await update('scripts/lint-web.mjs', (s) => s
  .replace("import { readdir, readFile }", "import { execFileSync } from 'node:child_process';\nimport { readdir, readFile }")
  .replace(
    "const roots = [join(webRoot, 'src'), join(webRoot, 'tests'), join(webRoot, 'vite.config.ts')];",
    "const roots = [join(webRoot, 'src'), join(webRoot, 'tests'), join(webRoot, 'vite.config.js'), join(webRoot, 'vitest.config.js'), join(repoRoot, 'apps', 'extension', 'src'), join(repoRoot, 'apps', 'extension', 'tests'), join(repoRoot, 'apps', 'extension', 'scripts'), join(repoRoot, 'apps', 'extension', 'vitest.config.js')];"
  )
  .replaceAll('collectTypeScript', 'collectJavaScript')
  .replaceAll("extname(path) === '.ts'", "['.js', '.mjs'].includes(extname(path))")
  .replaceAll("extname(entry.name) === '.ts'", "['.js', '.mjs'].includes(extname(entry.name))")
  .replace("  const source = await readFile(file, 'utf8');", "  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });\n  const source = await readFile(file, 'utf8');")
  .replace('arquivo(s) TypeScript verificados.', 'arquivo(s) JavaScript do site e da extensão verificados.')
);
await update('scripts/format-web.mjs', (s) => s.replace(
  "'.jsonc', '.ts'",
  "'.jsonc', '.js', '.mjs'"
));

await update('AGENTS.md', (s) => s.replace('## Validação', [
  '## Linguagens permitidas',
  '',
  '- O código próprio deve utilizar JavaScript, Python ou C# quando necessário; HTML, CSS e SQL também são permitidos.',
  '- A aplicação atual utiliza JavaScript ES Modules, HTML e CSS. Evite reintroduzir TypeScript ou outra linguagem de código.',
  '- Preserve a arquitetura site + extensão Chromium + Portal, sem introduzir serviços adicionais sem necessidade.',
  '',
  '## Validação',
].join('\n')));
await update('README.md', (s) => s.replace('## Desenvolvimento e validação', [
  '## Linguagens e ferramentas',
  '',
  'O site, a extensão e os testes usam JavaScript (ES Modules), HTML e CSS.',
  'TypeScript foi removido do código próprio e das dependências diretas.',
  'Vite, Vitest, Playwright, esbuild e Wrangler continuam como ferramentas de build e testes.',
  'Python, C# e SQL não são necessários para esta arquitetura sem backend ou banco.',
  'Detalhes: docs/architecture/javascript-migration.md.',
  '',
  '## Desenvolvimento e validação',
].join('\n')));
await update('docs/README.md', (s) => s.replace(
  'A arquitetura vigente é',
  'Decisão de stack: docs/architecture/javascript-migration.md.\n\nA arquitetura vigente é'
));
await writeFile(join(root, 'docs/architecture/javascript-migration.md'), [
  '# Migração de TypeScript para JavaScript',
  '',
  'Data: 2026-10-15. Base: v0.0.41 / extensão v0.2.16.',
  '',
  '## Decisão',
  '',
  '- JavaScript ES Modules no site, extensão, testes e ferramentas de configuração.',
  '- HTML e CSS continuam responsáveis pela apresentação.',
  '- Preservados Vite, Vitest, Playwright, esbuild e Wrangler como ferramentas de build/testes.',
  '- Removidos TypeScript, seus tsconfig e dependências diretas.',
  '- Lint passa a validar sintaxe JS nativa também para a extensão; testes, cobertura e build continuam obrigatórios.',
  '',
  '## Funcionalidades e fronteiras preservadas',
  '',
  'Site → extensão Chromium MV3 → Portal Nacional → hCaptcha humano → XML oficial → DANFE/ZIP.',
  'Permanecem consulta em lote sequencial, verificação da chave do XML e timeouts da extensão.',
  'Nenhum backend, D1, Bridge, consulta SEFAZ direta, acesso a certificado privado ou nova permissão.',
  '',
  '## Critérios de aceite',
  '',
  '- Aprovação dos jobs web, extension e danfe-print do CI, incluindo cobertura e dry-run Wrangler.',
  '- Teste manual no Chrome e no Edge continua necessário para aprovar o fluxo real do Portal.',
  '- A main deve continuar intacta até aprovação da branch de migração.',
  '',
  'O histórico Git preserva integralmente o código anterior para reversão.',
  '',
].join('\n'), 'utf8');

// O workflow temporário e este roteiro não são necessários no branch final.
await rm(join(root, '.github/workflows/migrate-javascript.yml'));
await rm(join(root, 'scripts/migrate-javascript.mjs'));
process.stdout.write('Migração efetuada nos arquivos da branch: ' + converted + ' arquivos TS convertidos.\n');
