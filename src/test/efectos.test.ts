import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Un efecto de React escrito en forma corta (`useEffect(() => algo(), …)`) devuelve lo que devuelva
 * `algo`, y React lo toma por la limpieza: si no es una función, al limpiar falla ("n is not a
 * function"). Pasó con `window.scrollTo`, que en Chromium (la app en Windows) devuelve una promesa y
 * en Safari no. Por eso todo efecto va entre llaves y, si limpia algo, lo devuelve a propósito; la
 * única forma corta que vale es la que es la limpieza misma (`useEffect(() => () => …, [])`).
 */
const ROOTS = ['src', 'dashboard-ia/frontend/src'];
const EFFECT = /^(React\.)?use(Layout|Insertion)?Effect$/;

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : files(p);
    return /\.tsx?$/.test(e.name) && !/ \d\./.test(e.name) ? [p] : [];
  });
}

/** Los efectos en forma corta que no son la limpieza misma, como `archivo:línea`. */
function shortEffects(): string[] {
  const out: string[] = [];
  for (const file of ROOTS.flatMap(files)) {
    const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && EFFECT.test(n.expression.getText(sf))) {
        const fn = n.arguments[0];
        const cleanup = (b: ts.Node) => ts.isArrowFunction(b) || ts.isFunctionExpression(b);
        if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && !ts.isBlock(fn.body) && !cleanup(fn.body)) {
          out.push(`${file}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
}

describe('los efectos de React', () => {
  it('van entre llaves: nunca devuelven sin querer lo que devuelve otra función', () => {
    expect(shortEffects()).toEqual([]);
  });
});
