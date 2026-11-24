import { createApp } from 'vue';
import App from './App.vue';
import './app/styles/fonts';
import './app/styles/dashboard.css';
import './app/styles/overrides.css';
import { Dashboard, type SaveResult } from './app/store/store';
import { localStore } from './app/store/persist';
import { WIDGETS, WIDGET_DATA } from './widgets';

type SavePicker = (opts: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<{
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
}>;

/**
 * ファイルに保存 (実装ガイド 5章). With the File System Access API the user picks the place and we wait until the file
 * is written (`saved`); cancelling the picker is `cancel`. Elsewhere (or when the picker cannot be used here) a download
 * is started (`started`): the browser gives no signal when (or whether) the file was stored, so the app only says that
 * saving started.
 */
async function saveFile(json: string, filename: string): Promise<SaveResult> {
  const blob = new Blob([json], { type: 'application/json' });
  const picker = (window as Window & { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  if (typeof picker === 'function') {
    try {
      const h = await picker.call(window, { suggestedName: filename, types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
      const w = await h.createWritable();
      await w.write(blob);
      await w.close();
      return 'saved';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancel';
      // Not allowed here (iframe, no user activation…): fall back to a download.
    }
  }
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); }, 4000);
    return 'started';
  } catch {
    return 'fail';
  }
}

const dash = new Dashboard({ store: localStore(), dataDefs: WIDGET_DATA, implemented: Object.keys(WIDGETS) });
dash.onExport = saveFile;
// Development only (removed from production builds): e2e tests and the display test reach the store.
if (import.meta.env.DEV) (window as Window & { __lgdDash?: Dashboard }).__lgdDash = dash;
createApp(App, { dash }).mount('#app');
