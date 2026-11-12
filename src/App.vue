<script setup lang="ts">
import { ref } from 'vue';
import { catalog } from './tools/catalog';
import { parseHex } from './tools/color/definition';

const hex = ref('#336699');
const result = ref<{ r: number; g: number; b: number } | null>(null);
const error = ref('');

function preview(): void {
  void parseHex.run({ hex: hex.value }).then(
    (parsed) => {
      result.value = { r: parsed.r, g: parsed.g, b: parsed.b };
      error.value = '';
    },
    () => {
      result.value = null;
      error.value = '6桁のHEXカラーを入力してください。';
    },
  );
}
</script>

<template>
  <main class="shell">
    <div class="eyebrow">TOOL-DASHBOARD / STAGE 1A</div>
    <h1>共通ツール契約の検証画面</h1>
    <p>これは最終ダッシュボードではありません。データ処理と表示を分離するための最小のWebシェルです。</p>
    <section aria-labelledby="catalog-title" class="panel">
      <h2 id="catalog-title">登録済みユーティリティ</h2>
      <ul>
        <li v-for="tool in catalog" :key="tool.kind">{{ tool.title }} <span>({{ tool.kind }})</span></li>
      </ul>
    </section>
    <section aria-labelledby="color-title" class="panel">
      <h2 id="color-title">HEX → RGB（UIプレビュー）</h2>
      <label for="hex">HEXカラー</label>
      <div class="controls">
        <input id="hex" v-model="hex" placeholder="#336699" autocomplete="off" />
        <button type="button" @click="preview">変換</button>
      </div>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <output v-if="result" class="result">RGB({{ result.r }}, {{ result.g }}, {{ result.b }})</output>
    </section>
  </main>
</template>
