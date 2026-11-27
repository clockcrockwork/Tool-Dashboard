/**
 * 日の出・日の入りの一時状態（保存しない）: 現在地と、その許可のお願い.
 *
 * - 現在地は Dashboard ごとの runtime にだけ置く（小数2桁に丸める。区画・書き出しに入らない。再読み込みで消える。実装ガイド 6章）。
 *   どの配置も同じ現在地を使う（端末の位置なので）。
 * - 許可のお願いは共通の仕組み（`askPerm(d, id, 'geo', …)`、`src/app/runtime/permission.ts`）。共通の枠がカードを出し、ブラウザに
 *   問い合わせるのは「位置を使う」「もう一度」を押したときだけ。問い合わせは位置を取ることそのもの（`request`。二度取らない）。
 * - カードを出すのは、場所が「現在地」で位置がまだ無いとき（プロトタイプ `pq.sun`: 場所の選択で「現在地」を選んだとき、また
 *   「現在地」のまま開いたとき）。許可済みなら、表示中のときだけ（`isShown`）カードを出さずに位置を取る（プロトタイプ `_geoNeed`）。
 *   人前では隠している間はカードを出さない（隠すのをやめたら出す）。
 * - 断られた・取れなかったら東京（日本時間）で出し、トーストで知らせる（仕様書 11章）。カードは直し方と「もう一度」「都市を選ぶ」。
 * - 「都市を選ぶ」はその配置の場所の選択メニュー（`selectOptions` の `sunloc:<配置ID>`）を開く。カードは場所が「現在地」の間は出したまま（選ばずに
 *   閉じても残る。プロトタイプと同じ）で、都市を選ぶと閉じる。
 */
import { reactive, watch } from 'vue';
import type { Dashboard } from '../../app/store/store';
import { isShown } from '../../app/store/visibility';
import { openSelectMenu } from '../../app/store/overlays';
import { askPerm, closePermAsk, permAskOf, permOf, setPermAsk, type AskOpts } from '../../app/runtime/permission';
import { geoSource, type GeoPoint } from './geo';
import { SUN_FALLBACK, SUN_GEO_ASK, SUN_GEO_FAIL, SUN_HERE, roundGeo } from './sun';

export type SunRuntime = {
  /** 現在地（丸めた値）. Null until it is known. Never saved. */
  geo: GeoPoint | null;
  /** A position request is running (a second press waits for the same one). */
  busy: Promise<boolean> | null;
};

const runtimes = new WeakMap<Dashboard, SunRuntime>();

export function sunRuntime(d: Dashboard): SunRuntime {
  let r = runtimes.get(d);
  if (!r) {
    r = reactive<SunRuntime>({ geo: null, busy: null });
    runtimes.set(d, r);
  }
  return r;
}

/** Gets the position (asks the browser; its own prompt may show). Not saved; a failure toasts and shows Tokyo. */
export function locate(d: Dashboard): Promise<boolean> {
  const rt = sunRuntime(d);
  if (rt.busy) return rt.busy;
  const p = geoSource().get().then((pos) => {
    rt.busy = null;
    if (pos && Number.isFinite(pos.lat) && Number.isFinite(pos.lng)) {
      rt.geo = roundGeo(pos.lat, pos.lng);
      return true;
    }
    d.toast(SUN_GEO_FAIL, 'warn');
    return false;
  }, () => {
    rt.busy = null;
    d.toast(SUN_GEO_FAIL, 'warn');
    return false;
  });
  rt.busy = p;
  return p;
}

/** The select menu key of a placement's place (`selectOptions`). */
export const sunLocKey = (id: string): `sunloc:${string}` => `sunloc:${id}`;

/**
 * 「都市を選ぶ」: the place menu of this placement, at the pressed button. Choosing a city closes the card and so removes the
 * button: focus then returns to the widget itself (closing without a choice keeps the card, and focus goes back to the button).
 */
export function chooseCity(d: Dashboard, id: string): void {
  if (typeof document === 'undefined') return;
  const sec = Array.from(document.querySelectorAll<HTMLElement>('section[data-wid]')).find(el => el.dataset.wid === id) ?? null;
  const root = sec?.closest<HTMLElement>('.dash') ?? document.querySelector<HTMLElement>('.dash');
  const act = document.activeElement;
  const btn = act instanceof HTMLElement && sec?.contains(act) ? act : sec?.querySelector<HTMLElement>('.perm .chip.ghost') ?? sec;
  const ret = (): HTMLElement | null => {
    if (btn?.isConnected) return btn;
    return Array.from(document.querySelectorAll<HTMLElement>('section[data-wid]')).find(el => el.dataset.wid === id) ?? null;
  };
  if (root) openSelectMenu(d, root, sunLocKey(id), '場所', btn, ret);
}

/** The request of a placement: the kind's sentences, getting the position as the request, 「都市を選ぶ」 for both alternatives. */
export function sunAsk(d: Dashboard, id: string): AskOpts {
  const pick = (): void => {
    chooseCity(d, id);
    // 場所が「現在地」で位置が無い間はカードを出したまま（プロトタイプ `pq.sun` は状態から出す）。都市を選べば閉じる.
    if (d.cfgOf(id, 'loc') === SUN_HERE && !sunRuntime(d).geo && permOf(d, 'geo') !== 'ok') askPerm(d, id, 'geo', sunAsk(d, id));
  };
  return { copy: SUN_GEO_ASK(SUN_FALLBACK), request: () => locate(d), alt: pick, noAlt: pick };
}

/**
 * While the widget is mounted: when its place is 「現在地」 without a position, open the shared request (or, already allowed
 * and shown, get the position at once); when the place is changed to a city, close it. `loc` reads the setting 「場所」.
 */
export function useSunGeo(d: Dashboard, id: string, loc: () => unknown): void {
  const rt = sunRuntime(d);
  watch(
    () => [loc() === SUN_HERE, !!rt.geo, permOf(d, 'geo'), d.veiled(id), isShown(d, id)] as const,
    ([here, has, perm, veiled, shown]) => {
      if (!here) {
        if (permAskOf(d, id)?.perm === 'geo') closePermAsk(d, id);
        return;
      }
      // 許可済みになった（読み込み直後に Permissions API の答えが後から届いた・アドレスバーで許可した）: お願いのカードは要らない.
      // 閉じてから下で位置を取る（表示中だけ）。「位置を使う」の問い合わせ中でも、取得は同じもの（`locate` の busy）を待つ.
      if (perm === 'ok' && permAskOf(d, id)?.perm === 'geo') closePermAsk(d, id);
      if (has || veiled || permAskOf(d, id) || rt.busy) return;
      // 許可済みのときに位置を取るのは表示中だけ。まだ聞いていない・断られたときのカードは出しておく（問い合わせはしない）.
      if (perm === 'ok' && !shown) return;
      askPerm(d, id, 'geo', sunAsk(d, id));
    },
    { immediate: true, flush: 'sync' },
  );
}

/** Stories and tests: put a position as is (null clears it). */
export function setSunGeo(d: Dashboard, geo: GeoPoint | null): void {
  sunRuntime(d).geo = geo ? roundGeo(geo.lat, geo.lng) : null;
}
/** Stories and tests: show the request card as is (`no` marks the permission refused). */
export function setSunAsk(d: Dashboard, id: string, st: 'ask' | 'no' | null): void {
  setPermAsk(d, id, 'geo', st, sunAsk(d, id));
}
