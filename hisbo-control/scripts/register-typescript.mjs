// Local test loader only: retain existing test assertions and resolve app TS imports.
import { registerHooks, createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const nextEntries = new Map(['next/headers', 'next/server'].map(name => [name, pathToFileURL(require.resolve(name)).href]));
const ssrEntry = pathToFileURL(require.resolve('@supabase/ssr')).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    // This package's CommonJS re-exports aren't discoverable as ESM named exports.
    if (specifier === '@supabase/ssr') return { url: 'hisbo-test:ssr', shortCircuit: true };
    if (specifier.startsWith('@/') || (specifier.startsWith('.') && !context.parentURL?.includes('/node_modules/'))) {
      const base = specifier.startsWith('@/')
        ? path.join(root, 'src', specifier.slice(2))
        : fileURLToPath(new URL(specifier, context.parentURL));
      for (const candidate of [base, base + '.ts', base + '.tsx', base + '.js']) {
        if (existsSync(candidate) && path.extname(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      }
    }
    if (specifier === 'next/headers' || specifier === 'next/server') {
      return { url: nextEntries.get(specifier), shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'hisbo-test:ssr') return {
      format: 'module', shortCircuit: true,
      source: `import pkg from ${JSON.stringify(ssrEntry)}; export const { createServerClient, createBrowserClient } = pkg;`,
    };
    if (/\.tsx?$/.test(url)) {
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      }).outputText };
    }
    return nextLoad(url, context);
  },
});
