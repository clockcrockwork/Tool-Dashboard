import type { Meta, StoryObj } from '@storybook/vue3-vite';
import MenuLayer from '../../app/shell/overlays/MenuLayer.vue';
import { menuGeometry, menuHeight, selectOptions, widgetMenuItems } from '../../app/store/overlays';
import type { Dashboard } from '../../app/store/store';
import type { MenuAnchor } from '../../app/store/types';
import { boards } from '../dash';
import type { LgdParams } from '../storybook';

type Args = { pin: boolean; lock: boolean; veil: boolean };

/** (16, 10) の点から開いたことにする。幅 `rw` が520px未満の選択メニューは下からのシートになる。 */
function openAt(d: Dashboard, kind: 'widget' | 'select', id: string, al: string, rw = 600, rh = 460): void {
  const at: MenuAnchor = { l: 16, t: 4, w: 0, h: 0, rw, rh, al };
  const n = kind === 'widget' ? widgetMenuItems(d, id) : selectOptions(d, id).map(() => ({ sep: false }));
  d.ui.mnQ = '';
  d.ui.mnAt = at;
  d.ui.mn = { kind, id, ...menuGeometry(kind, at, menuHeight(n, kind === 'select' && n.length > 12)) };
}

/**
 * その他メニュー `.mnu[role=menu]` と選択メニュー `.mnu[role=listbox]`（仕様書 4章、部品シート 5章「選択メニュー」・8章「その他メニュー」）。
 *
 * その他メニュー: 編集にしなくても、そのウィジェットの操作を出す（右クリック・長押し・「…」・Shift+F10）。
 * 設定・大きく表示・位置を固定・大きさを固定・人前では隠す・ボードから外す（危険な操作は最後に区切って赤）。
 * 選択メニュー: 5個以上の択一。↑↓で移動、Enter で決定、Esc で閉じる。13個以上で先頭に絞り込みの欄。幅520px未満は下からのシート。
 * 項目を押すと本物の操作が走ってメニューが閉じる。
 */
const meta = {
  title: 'Shell/MenuLayer',
  component: MenuLayer,
  tags: ['autodocs'],
  args: { pin: false, lock: true, veil: true },
  argTypes: {
    pin: { description: '位置を固定（チェック）' },
    lock: { description: '大きさを固定（チェック）' },
    veil: { description: '人前では隠す（チェック）' },
  },
  parameters: {
    lgd: {
      layout: 'bar',
      height: 360,
      setup: (d, a) => {
        d.g.pins = a.pin ? { todo: [0, 0, 0] } : {};
        d.g.lockSz = a.lock ? { todo: true } : {};
        d.setCfg('todo', 'veil', !!a.veil);
        openAt(d, 'widget', 'todo', '');
      },
    } satisfies LgdParams,
  },
  render: () => ({ components: { MenuLayer }, template: '<MenuLayer />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

/** TODO のその他メニュー（大きさを固定・人前では隠すがオン）。 */
export const WidgetMenu: Story = { name: 'その他メニュー（TODO）' };

/** 「大きく表示」があるウィジェット（メモ）。 */
export const WidgetMenuBig: Story = {
  name: 'その他メニュー（メモ・大きく表示あり）',
  parameters: { lgd: { layout: 'bar', height: 400, setup: d => { openAt(d, 'widget', 'memo', ''); } } satisfies LgdParams },
};

/** 選択メニュー（日の出・日の入りの「場所」、6個）。 */
export const Select: Story = {
  name: '選択メニュー（場所）',
  parameters: { lgd: { layout: 'bar', height: 360, setup: d => { openAt(d, 'select', 'sunloc', '場所'); } } satisfies LgdParams },
};

/** 13個以上は先頭に絞り込みの欄（ホーム、ボード14）。 */
export const SelectFilter: Story = {
  name: '選択メニュー（13個以上で絞り込み）',
  parameters: { lgd: { layout: 'bar', height: 460, setup: d => { boards(d, 14); openAt(d, 'select', 'home', 'ホーム'); } } satisfies LgdParams },
};

/** 幅520px未満では下からのシート。 */
export const SelectDock: Story = {
  name: '選択メニュー（幅520px未満は下から）',
  parameters: { lgd: { layout: 'bar', height: 420, width: 390, setup: d => { openAt(d, 'select', 'sunloc', '場所', 390, 420); } } satisfies LgdParams },
};
