/**
 * アラームの見張り（登録の `run: 'watch'`、p2a-followup.md 1章「種類ごとにすること」）. Dashboard の実行管理
 * （`src/app/runtime/runtime.ts`）が配置ごとに1回 `start` を呼び、Dashboard が動いている間は、未配置でも・部品を描いて
 * いなくても見張る。
 *
 * - オンのアラームがあれば、次に鳴る時刻を期限にする（timer は1本、1秒ごとに数えない）。すべてオフなら期限を消す（timer を放す）。
 * - 時刻（設定 a1・a2）やスイッチ（記録）が変わったら、すぐ予定を立て直す。変えた時刻の分にいても、その分は鳴らさない。
 * - 期限で呼ばれたら、そのときの時刻で判定する（`alarmsDue`）: 1分より前に過ぎた期限は鳴らさない（スリープ・裏のタブ）。
 *   同じアラームの同じ分は2度鳴らさない（最後に鳴らした分を覚える。通知の key も分ごと）。
 * - 鳴らすのは担当のタブだけ（P3 の Web Locks、今は常に担当）。知らせは共通の通知（伏せ方・出し分け・重複の防止はそちら）。
 * - 鳴った・鳴らしていないは保存しない。
 */
import { watch } from 'vue';
import type { Runner } from '../../app/runtime/runtime';
import { alarmTimes, alarmsDue, nextAlarmAt, occurrence } from './alarm';
import type { AlarmData } from './data';

export const alarmRunner: Runner = {
  start(ctx) {
    const { d, id } = ctx;
    const times = (): [string, string] => alarmTimes(k => d.cfgOf(id, k));
    const on = (): readonly boolean[] => d.dataOf<AlarmData | undefined>(id)?.on ?? [false, false];
    /** Time of the last judgement: an alarm rings when its minute begins after it. */
    let prev = d.now();
    /** Per alarm: the minute last rung. */
    const rung = new Map<number, number>();

    const plan = (): void => {
      const at = nextAlarmAt(times(), on(), d.now());
      if (at === null) ctx.cancel();
      else ctx.at(at, check);
    };
    function check(now: number): void {
      const t = times();
      for (const i of alarmsDue(t, on(), prev, now)) {
        const hm = t[i] ?? '';
        const at = occurrence(hm, now);
        if (at === null || rung.get(i) === at) continue;
        rung.set(i, at);
        if (ctx.owns('alarm')) ctx.notify({ key: 'alarm:' + id + ':' + String(i) + ':' + String(at), text: 'アラーム ' + hm, title: 'アラーム', body: hm, kind: 'info' });
      }
      prev = now;
      plan();
    }
    watch(() => [...times(), ...on()].join('|'), () => { prev = d.now(); plan(); }, { immediate: true, flush: 'sync' });
  },
};
