/**
 * メモの Markdown (仕様書 6章「メモのMarkdown」). Port of prototype `mdLines`, `segs`, `pvLines`, `memoKey`, `mdEdit()`.
 * 色分け層は色と取り消し線だけで行い、太さや大きさは変えない (ずれを防ぐ).
 */

/** One line of the colour layer: marker `m` (muted) + text `t` with class `c`. */
export type MdLine = { m: string; t: string; c: string };

export function mdLine(ln: string): MdLine {
  let m: RegExpExecArray | null;
  if ((m = /^(#{1,6}\s)(.*)$/.exec(ln))) return { m: m[1] ?? '', t: m[2] ?? '', c: 'mh' };
  if ((m = /^(\s*[-*+]\s\[([ xX])\]\s)(.*)$/.exec(ln))) return { m: m[1] ?? '', t: m[3] ?? '', c: m[2] === ' ' ? '' : 'mdn' };
  if ((m = /^(\s*(?:[-*+]|\d+\.)\s)(.*)$/.exec(ln))) return { m: m[1] ?? '', t: m[2] ?? '', c: '' };
  if ((m = /^(>\s?)(.*)$/.exec(ln))) return { m: m[1] ?? '', t: m[2] ?? '', c: 'mq' };
  return { m: '', t: ln, c: '' };
}

/** Inline segments: **bold** → `sb`, `code` → `sc`. */
export type Seg = { t: string; c: string };
export function segs(t: string): Seg[] {
  return t.split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(x => x !== '').map(x => (
    /^\*\*.+\*\*$/.test(x) ? { t: x.slice(2, -2), c: 'sb' } : (/^`.+`$/.test(x) ? { t: x.slice(1, -1), c: 'sc' } : { t: x, c: '' })
  ));
}

/** Preview line kinds: h1–h3, ck (check), li, q, hr, p. */
export type PvLine = { k: string; chk: boolean; done: boolean; al: string; segs: Seg[] };

export function pvLine(ln: string): PvLine {
  let m: RegExpExecArray | null;
  const base = { chk: false, done: false, al: '' };
  if ((m = /^(#{1,6})\s+(.*)$/.exec(ln))) return { ...base, k: 'h' + String(Math.min(3, (m[1] ?? '#').length)), segs: segs(m[2] ?? '') };
  if ((m = /^\s*[-*+]\s\[([ xX])\]\s(.*)$/.exec(ln))) {
    const done = m[1] !== ' ';
    const body = m[2] ?? '';
    return { k: 'ck' + (done ? ' on' : ''), chk: true, done, al: body || 'チェック項目', segs: segs(body) };
  }
  if ((m = /^\s*(?:[-*+]|\d+\.)\s(.*)$/.exec(ln))) return { ...base, k: 'li', segs: segs(m[1] ?? '') };
  if ((m = /^>\s?(.*)$/.exec(ln))) return { ...base, k: 'q', segs: segs(m[1] ?? '') };
  if (/^-{3,}\s*$/.test(ln)) return { ...base, k: 'hr', segs: [] };
  return { ...base, k: 'p', segs: segs(ln) };
}

/** Preview check toggle: rewrites `[ ]` ⇄ `[x]` on line `i` of the text. */
export function toggleCheck(text: string, i: number): string {
  const a = text.split('\n');
  const ln = a[i];
  if (ln === undefined) return text;
  const done = /^\s*[-*+]\s\[[xX]\]/.test(ln);
  a[i] = ln.replace(/\[[ xX]\]/, done ? '[ ]' : '[x]');
  return a.join('\n');
}

export type Edit = { value: string; a: number; b: number };

/**
 * Enter in a list / quote line: carry the marker to the next line ([x] becomes [ ]); on an empty item remove the marker.
 * Returns null when Enter should behave normally.
 */
export function continueList(value: string, a: number, b: number = a): Edit | null {
  if (a !== b) return null;
  const ls = value.lastIndexOf('\n', a - 1) + 1;
  const m = /^(\s*(?:[-*+]\s(?:\[[ xX]\]\s)?|>\s))(.*)$/.exec(value.slice(ls, a));
  if (!m) return null;
  if (m[2] === '') return { value: value.slice(0, ls) + value.slice(a), a: ls, b: ls };
  const mk = (m[1] ?? '').replace(/\[[xX]\]/, '[ ]');
  const at = a + 1 + mk.length;
  return { value: value.slice(0, a) + '\n' + mk + value.slice(a), a: at, b: at };
}

export type FormatKind = 'h' | 'li' | 'ck' | 'b' | 'c' | 'q';
/** 入力補助の帯: [kind, button text, accessible name]. */
export const MEMO_TOOLS: readonly (readonly [FormatKind, string, string])[] = [
  ['h', 'H', '見出し'], ['li', '•', '箇条書き'], ['ck', '☐', 'チェック項目'], ['b', 'B', '太字'], ['c', '`', 'コード'], ['q', '>', '引用'],
];

/** Format buttons: line prefixes toggle (見出しは # → ## → ### → なし); bold / code wrap the selection. */
export function applyFormat(kind: FormatKind, value: string, a0: number, b0: number): Edit {
  let a = a0, b = b0;
  const pre = ({ h: '# ', li: '- ', ck: '- [ ] ', q: '> ' } as Partial<Record<FormatKind, string>>)[kind];
  if (pre) {
    const ls = value.lastIndexOf('\n', a - 1) + 1;
    const cur = /^(#{1,6}\s|\s*[-*+]\s\[[ xX]\]\s|\s*[-*+]\s|>\s?)/.exec(value.slice(ls));
    const old = cur?.[1] ?? '';
    let np = pre;
    if (kind === 'h' && /^#{1,2}\s$/.test(old)) np = old.replace(' ', '# ');
    else if (old === pre || (kind === 'h' && /^#{3,}\s$/.test(old))) np = '';
    const nv = value.slice(0, ls) + np + value.slice(ls + old.length);
    const d = np.length - old.length;
    a = Math.max(ls, a + d); b = Math.max(ls, b + d);
    return { value: nv, a, b };
  }
  const wrap = kind === 'b' ? '**' : '`';
  return { value: value.slice(0, a) + wrap + value.slice(a, b) + wrap + value.slice(b), a: a + wrap.length, b: b + wrap.length };
}

/** 文字数 (空白を除く、書記素ではなくコードポイント — prototype と同じ). */
export function charCount(text: string): number {
  return Array.from(text.replace(/\s/g, '')).length;
}

/** Index of the line that holds the caret. */
export function lineAt(value: string, caret: number): number {
  return value.slice(0, caret).split('\n').length - 1;
}
