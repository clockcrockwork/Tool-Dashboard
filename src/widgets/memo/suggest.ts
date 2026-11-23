/**
 * メモから予定・TODOへ (仕様書 6章). 行を「かたまり」として認識し、追加を提案するだけ. Port of prototype `parseCand`, `whenText`, `sug`.
 *  - TODO: 未チェックの項目 (`- [ ] 牛乳を買う`)、または行頭が「TODO」「やること」
 *  - 予定: 日付（今日・明日・明後日、11/20、11月20日）か時刻（14:00、14時、14時半）を含む行。「3時間」のような長さは除く
 */
import { hhmm } from '../shared/guards';
import type { SugResult } from './data';

export type Cand =
  | { kind: 'todo'; title: string }
  | { kind: 'ev'; title: string; ts: number; hasTime: boolean };

export function parseCand(ln: string, now: Date): Cand | null {
  let r = /^\s*[-*+]\s\[ \]\s+(.+)$/.exec(ln);
  if (r) return { kind: 'todo', title: (r[1] ?? '').trim() };
  r = /^\s*(?:TODO|Todo|todo|やること)[:：\s]\s*(.+)$/.exec(ln);
  if (r) return { kind: 'todo', title: (r[1] ?? '').trim() };
  if (/^\s*[-*+]\s\[[xX]\]/.test(ln)) return null;
  const y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  const body = ln.replace(/^\s*(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s?)/, '');
  const dm = /(今日|明日|明後日|(\d{1,2})[/月](\d{1,2})日?)/.exec(body);
  const tm = /(\d{1,2})[:：](\d{2})|(\d{1,2})時(?!間)(?:(\d{1,2})分|半)?/.exec(body);
  if (!dm && !tm) return null;
  let when = new Date(y, m, today);
  if (dm) {
    if (dm[1] === '明日') when = new Date(y, m, today + 1);
    else if (dm[1] === '明後日') when = new Date(y, m, today + 2);
    else if (dm[2]) {
      const mo = Number(dm[2]), da = Number(dm[3]);
      if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
      when = new Date(y, mo - 1, da);
      if (when.getTime() < new Date(y, m, today).getTime() - 864e5) when = new Date(y + 1, mo - 1, da);
    }
  }
  let hasTime = false;
  if (tm) {
    const hh = Number(tm[1] ?? tm[3]);
    const mm = tm[2] ? Number(tm[2]) : (tm[4] ? Number(tm[4]) : (/半/.test(tm[0]) ? 30 : 0));
    if (hh < 24 && mm < 60) { when.setHours(hh, mm, 0, 0); hasTime = true; }
    else if (!dm) return null;
  }
  let title = body;
  if (dm) title = title.replace(dm[0], ' ');
  if (tm) title = title.replace(tm[0], ' ');
  title = title.replace(/\s+/g, ' ').replace(/^[\s:：、,に]+/, '').trim();
  return { kind: 'ev', title: title || '予定', ts: when.getTime(), hasTime };
}

/** 「今日 14:00」「明日」「11.22 9:00」. */
export function whenText(ts: number, hasTime: boolean, now: Date): string {
  const d = new Date(ts);
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dd = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - day0) / 864e5);
  const day = dd === 0 ? '今日' : (dd === 1 ? '明日' : String(d.getMonth() + 1) + '.' + String(d.getDate()));
  return day + (hasTime ? ' ' + hhmm(ts) : '');
}

/** A recognised line: line index, the key it is remembered by (trimmed text) and the earlier result. */
export type LineCand = Cand & { i: number; key: string; state: SugResult | '' };

export function candidates(lines: readonly string[], done: Readonly<Record<string, SugResult>>, now: Date): (LineCand | null)[] {
  return lines.map((ln, i) => {
    const c = parseCand(ln, now);
    if (!c) return null;
    const key = ln.trim();
    return { ...c, i, key, state: done[key] ?? '' };
  });
}

/** The one suggestion to show: first unanswered candidate that is not on the caret line (-1 = not editing). */
export function pickSuggestion(cands: readonly (LineCand | null)[], caretLine: number): LineCand | null {
  return cands.find((c): c is LineCand => !!c && !c.state && c.i !== caretLine) ?? null;
}

/** Text in the suggestion strip: 「明日 14:00　打ち合わせ」 or the TODO title. */
export function suggestionText(c: LineCand, now: Date): string {
  return c.kind === 'ev' ? whenText(c.ts, c.hasTime, now) + '　' + c.title : c.title;
}
