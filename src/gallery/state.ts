/** ギャラリー上部の切替（テーマ・動き・速さ）。部品シートの renderVals() と同じ選択肢。 */
import { inject, reactive, type InjectionKey } from 'vue';

export type GalleryTheme = 'both' | 'l' | 'd';
export type GalleryState = { th: GalleryTheme; rm: boolean | null; slow: boolean };

export const GALLERY_KEY: InjectionKey<GalleryState> = Symbol('gallery');

export function createGalleryState(): GalleryState {
  return reactive<GalleryState>({ th: 'both', rm: null, slow: false });
}

export function useGallery(): GalleryState {
  const s = inject(GALLERY_KEY);
  if (!s) throw new Error('useGallery() must be used inside <GalleryApp>.');
  return s;
}

/** 「動き」の既定は端末の設定（prefers-reduced-motion）に従う。 */
export function reducedMotion(s: GalleryState): boolean {
  if (s.rm !== null) return s.rm;
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
