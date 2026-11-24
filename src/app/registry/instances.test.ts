import { describe, expect, it } from 'vitest';
import { defOf, instanceId, instanceNo, isInstanceId, kindOf, nameOf, nextInstanceId, sortInstances } from './instances';
import { REGISTRY } from './registry';

describe('種類 ID と配置 ID (実装ガイド 4章 id・7.4)', () => {
  it('reads the kind and number of a placement ID', () => {
    expect(kindOf('links')).toBe('links');
    expect(kindOf('links#2')).toBe('links');
    expect(instanceNo('links')).toBe(1);
    expect(instanceNo('links#12')).toBe(12);
    expect(instanceNo('links#02')).toBeNaN();
    expect(instanceId('links', 1)).toBe('links');
    expect(instanceId('links', 3)).toBe('links#3');
  });
  it('accepts a second placement only for kinds with multi: true', () => {
    expect(REGISTRY.links?.multi).toBe(true);
    expect(REGISTRY.search?.multi).toBe(false);
    expect(isInstanceId('links')).toBe(true);
    expect(isInstanceId('links#2')).toBe(true);
    expect(isInstanceId('search')).toBe(true);
    expect(isInstanceId('search#2')).toBe(false);
  });
  it('rejects unknown kinds and malformed numbers', () => {
    for (const bad of ['stretch', 'stretch#2', 'links#', 'links#1', 'links#0', 'links#-1', 'links#2#3', 'links#02', 'links#x', '', 3, null]) {
      expect(isInstanceId(bad)).toBe(false);
    }
  });
  it('looks the registry entry up by kind', () => {
    expect(defOf('links#2')).toBe(REGISTRY.links);
    expect(defOf('search#2')).toBeUndefined();
    expect(nameOf('clock#2')).toBe('時計');
  });
  it('picks the smallest free number and sorts by registry order', () => {
    expect(nextInstanceId('links', ['links'])).toBe('links#2');
    expect(nextInstanceId('links', ['links', 'links#2', 'links#4'])).toBe('links#3');
    expect(sortInstances(['memo', 'links#2', 'clock', 'links', 'bogus', 'clock'])).toEqual(['clock', 'links', 'links#2', 'memo']);
  });
});
