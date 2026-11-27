/**
 * ポモドーロの完了（登録の `run: 'continuous'`、p2a-followup.md 1章「種類ごとにすること」）. Dashboard の実行管理が配置ごとに
 * 1回 `start` を呼ぶ。動いている間は終わる時刻を期限にし（timer は1本）、期限で**同じ実行が一度だけ**完了する:
 *
 * - 期限の callback は、そのときの実行 ID（`rid`）を持つ。一時停止・リセット・始め直しで実行 ID が変わると、古い callback は
 *   何もしない（期限も入れ直す）。完了すると止まった状態にする（実行 ID が変わる）ので、2度目の完了は起きない。
 * - 一時利用を閉じても・未配置でも・部品を描いていなくても完了する。開き直しても新しく始まらない（始めるのはスタートの操作だけ）。
 * - 知らせは共通の通知（「完了を通知」がオフなら出さない。人前では隠している間は伏せた文）。重複の key は実行 ID。
 */
import { watch } from 'vue';
import type { Runner } from '../../app/runtime/runtime';
import { runtimeOf } from '../../app/runtime/runtime';
import { POMO_IDLE, pomoFinished } from './pomo';
import { pomoRunOf, setPomoRun } from './status';

export const pomoRunner: Runner = {
  start(ctx) {
    const { d, id } = ctx;
    const rt = runtimeOf(d);
    const plan = (): void => {
      const r = pomoRunOf(d, id);
      if (!r.on || r.endAt === null) { ctx.cancel(); return; }
      const rid = rt.rid(id);
      ctx.at(r.endAt, (now) => { finish(rid, now); });
    };
    function finish(rid: number, now: number): void {
      if (rt.rid(id) !== rid) return;
      if (!pomoFinished(pomoRunOf(d, id), now)) { plan(); return; }
      setPomoRun(d, id, POMO_IDLE);
      ctx.notify({ key: 'pomo:' + id + ':' + String(rid), text: 'ポモドーロ完了', body: '集中の時間が終わりました', kind: 'ok' });
    }
    watch(() => rt.rid(id), plan, { immediate: true, flush: 'sync' });
  },
};
