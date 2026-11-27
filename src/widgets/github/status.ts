/**
 * GitHub PR の一時状態（保存しない）: 5つの状態と、取った内容（表示中だけ取得・更新。`../rss/source.ts`）.
 * 開発用の表示テストからは `setGithubState(d, 'err')` のように呼ぶ。
 */
import { REGISTRY } from '../../app/registry/registry';
import type { Dashboard } from '../../app/store/store';
import { externalSource, type SourceState } from '../rss/source';
import type { Pr } from './github';
import { sampleGithub } from './adapter';
import { SAMPLE_PRS } from './sample';

const every = REGISTRY.github?.refresh?.every;
/** Freshness from the registry `refresh` (null until P4: the sample is not fetched again). */
export const GITHUB_REFRESH_MS: number | null = typeof every === 'number' ? every * 1000 : null;
export const GITHUB_KEY = 'prs';

export const githubSource = externalSource<readonly Pr[]>({
  initial: () => SAMPLE_PRS, adapter: () => sampleGithub(), refreshMs: GITHUB_REFRESH_MS, empty: v => v.length === 0,
});

export const setGithubState = (d: Dashboard, st: SourceState): void => { githubSource.setState(d, st); };
export const githubState = (d: Dashboard): SourceState => githubSource.state(d);
export const retryGithub = (d: Dashboard, id: string): void => { githubSource.retry(d, id, GITHUB_KEY, { adapter: sampleGithub(1400) }); };
