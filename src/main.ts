import { createApp } from 'vue';
import App from './App.vue';
import './app/styles/fonts';
import './app/styles/dashboard.css';
import { Dashboard } from './app/store/store';
import { localStore } from './app/store/persist';
import { WIDGET_DATA } from './widgets';

const dash = new Dashboard({ store: localStore(), dataDefs: WIDGET_DATA });
dash.onExport = (json) => {
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = 'dashboard-' + String(d.getFullYear()) + p2(d.getMonth() + 1) + p2(d.getDate()) + '.json';
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); }, 4000);
};
createApp(App, { dash }).mount('#app');
