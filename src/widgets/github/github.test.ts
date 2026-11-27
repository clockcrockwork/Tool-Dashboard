import { describe, expect, it } from 'vitest';
import { Dashboard } from '../../app/store/store';
import { memoryStore } from '../../app/store/persist';
import { PR_ICON, prRows } from './github';
import { SAMPLE_PRS } from './sample';
import { GITHUB_REFRESH_MS, githubSource, githubState, setGithubState } from './status';

describe('prRows（プロトタイプのマークアップの4行）', () => {
  it('番号・題名・状態と状態ごとの印', () => {
    const r = prRows(SAMPLE_PRS);
    expect(r.map(x => [x.num, x.t, x.st])).toEqual([
      ['#128', 'ページング修正', 'Open'], ['#127', 'ダークモード対応', 'Review'], ['#126', 'トースト通知追加', 'Draft'], ['#124', '依存関係更新', 'Merged'],
    ]);
    expect(r[0]?.icon).toBe(PR_ICON.Open);
    expect(PR_ICON.Open.style).toBe('color: var(--a1)');
    expect(PR_ICON.Review).toMatchObject({ circles: [], style: 'color: var(--a2)' });
    expect(PR_ICON.Draft.style).toContain('stroke-dasharray: 2.5 2.5');
    expect(PR_ICON.Merged.circles).toEqual([[7, 6], [7, 18], [17, 12]]);
  });
  it('空', () => { expect(prRows([])).toEqual([]); });
});

describe('5つの状態（表示テスト）', () => {
  it('setGithubState で切り替え、Dashboard ごと。間隔は P4 まで null', () => {
    const d = new Dashboard({ store: memoryStore(), dataDefs: {} });
    expect(githubState(d)).toBe('ok');
    for (const st of ['load', 'stale', 'empty', 'err', 'ok'] as const) { setGithubState(d, st); expect(githubState(d)).toBe(st); }
    expect(GITHUB_REFRESH_MS).toBeNull();
    expect(githubSource.place(d, 'github', 'prs').val).toEqual(SAMPLE_PRS);
  });
});
