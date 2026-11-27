import { describe, expect, it } from 'vitest';
import { REGISTRY } from '../../app/registry/registry';
import { QUOTE } from './quote';

describe('名言', () => {
  it('プロトタイプの1つの名言。通信・記録・設定・更新なし（受動）', () => {
    expect(QUOTE).toEqual({ text: '千里の道も一歩から', by: '老子' });
    expect(REGISTRY.quote).toMatchObject({ net: '', perm: [], f: [], states: [], run: 'none' });
    expect(REGISTRY.quote?.refresh).toBeUndefined();
  });
});
