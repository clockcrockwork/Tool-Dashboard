import type { Meta, StoryObj } from '@storybook/vue3-vite';
import TourCard from '../../app/shell/overlays/TourCard.vue';
import BottomNav from '../../app/shell/BottomNav.vue';
import { boards } from '../dash';
import type { LgdParams } from '../storybook';

type Args = { step: number };

/**
 * 最初の案内 `.tcard`（仕様書 2章「はじめて開いたとき」、実装ガイド 7.2、部品シート 6章「最初の案内」）。初回だけの5手順。
 * 1〜4手順目は下部バーの対象のボタンを輪（`.hl`）で示す。5手順目は環境ごとの「使い始めの準備」（ブラウザ・アプリ・スマホで文が変わる）。
 * 「次へ」「スキップ」「はじめる」は本物の操作（終わると案内が消える）。
 */
const meta = {
  title: 'Shell/TourCard',
  component: TourCard,
  tags: ['autodocs'],
  args: { step: 0 },
  argTypes: { step: { control: { type: 'range', min: 0, max: 4, step: 1 }, description: '手順（0から。4 が「使い始めの準備」）' } },
  parameters: {
    lgd: {
      layout: 'bar',
      height: 340,
      setup: (d, a) => { boards(d, 3); d.g.tourDone = false; d.ui.tour = Number(a.step); },
    } satisfies LgdParams,
  },
  render: () => ({ components: { TourCard, BottomNav }, template: '<TourCard /><BottomNav />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

/** 1手順目: 画面の切り替え（画面の点を強調）。 */
export const Step1: Story = { name: '1手順目（画面の切り替え）' };
/** 2手順目: 一覧。 */
export const Step2: Story = { name: '2手順目（一覧）', args: { step: 1 } };
/** 5手順目: 使い始めの準備（環境ごとの文。スキップは無く「はじめる」）。 */
export const Step5: Story = { name: '5手順目（使い始めの準備）', args: { step: 4 } };
