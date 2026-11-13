<script setup lang="ts">
import type { Config, LocalRepository } from './local-repository';
import { useToolController } from './tool-controller';
const props = defineProps<{ config: Config; repository: LocalRepository; label: string }>();
const { draft, error, result, conflict, supported, time, send } = useToolController(props);
</script>

<template>
  <div
    v-if="supported"
    class="tool"
  >
    <div
      v-if="config.kind === 'clock'"
      class="clock"
      aria-live="off"
    >
      {{ time }}
    </div>
    <form @submit.prevent="send({ type: 'submit' })">
      <label :for="`field-${label}`">{{ config.kind === 'clock' ? 'タイムゾーン' : 'HEXカラー' }}</label>
      <div class="controls">
        <input
          :id="`field-${label}`"
          :value="draft"
          autocomplete="off"
          :placeholder="config.kind === 'clock' ? 'Asia/Tokyo' : '#336699'"
          @input="send({ type: 'change:value', value: ($event.target as HTMLInputElement).value })"
        >
        <button type="submit">
          {{ config.kind === 'clock' ? '保存' : '変換して保存' }}
        </button>
      </div>
    </form>
    <p
      v-if="conflict"
      role="alert"
      class="warning"
    >
      別の画面で設定が変更されました。編集中の内容は保持されています。保存するには最新の設定を読み込み直してください。
    </p>
    <button
      v-if="conflict"
      type="button"
      class="secondary"
      @click="send({ type: 'reload' })"
    >
      最新の設定を読み込む
    </button>
    <p
      v-if="error"
      role="alert"
      class="error"
    >
      {{ error }}
    </p>
    <output
      v-if="result"
      class="result"
    >RGB({{ result.r }}, {{ result.g }}, {{ result.b }})</output>
  </div>
  <p v-else>
    未対応のツールまたは新しい設定バージョンです。内容を変更せず保持しています。
  </p>
</template>
