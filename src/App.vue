<script setup lang="ts">
import { liveQuery } from 'dexie';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { LocalRepository, type Config, type Placement, type RemovalPreview } from './web/local-repository';
import { migrateConfigs } from './web/migrations';
import { importText, inspectExport, parseExport, saveOpaqueImport, serializeRemoval } from './web/export-import';
import { importLegacyBoard, previewLegacyBoard } from './web/legacy-import';
import ToolView from './web/ToolView.vue';

const repository = new LocalRepository();
const placements = ref<Placement[]>([]);
const configs = ref<Config[]>([]);
const edit = ref(false);
const screen = ref<'board' | 'standalone'>('board');
const error = ref('');
const notice = ref('');
const removal = ref<RemovalPreview | null>(null);
const removeMode = ref<'detach' | 'export' | 'delete'>('detach');
const downloaded = ref(false);
const saved = ref(false);
const imported = ref<{ raw: string; kind: 'current' | 'future' | 'legacy' | 'opaque'; summary: string } | null>(null);
const opaqueImports = ref<{ id: string; raw: string }[]>([]);
const ready = ref(false);
const dialog = ref<HTMLElement | null>(null);
let dialogOpener: HTMLElement | null = null;
const defaults: Record<'clock' | 'color', { value: string }> = { clock: { value: 'Asia/Tokyo' }, color: { value: '#336699' } };
const configMap = computed(() => new Map(configs.value.map(c => [c.key, c])));
const ordered = computed(() => [...placements.value].sort((a, b) => a.position - b.position || a.placementId.localeCompare(b.placementId)));
const unplaced = computed(() => configs.value.filter(c => c.key.startsWith('instance:') && !placements.value.some(p => `instance:${p.instanceId}` === c.key)));
let subscription: { unsubscribe: () => void } | undefined;

onMounted(() => {
  void (async () => {
    try {
      const policy = { currentVersion: 1, steps: {}, isCurrent: () => false };
      await migrateConfigs(repository, { clock: policy, color: policy });
      subscription = liveQuery(async () => ({ placements: await repository.placements.toArray(), configs: await repository.configs.toArray(), opaque: await repository.opaqueImports.toArray() })).subscribe({
        next: value => { placements.value = value.placements; configs.value = value.configs; opaqueImports.value = value.opaque; },
        error: () => { error.value = 'ローカルデータを開けませんでした。ブラウザの保存設定を確認してください。'; ready.value = false; },
      });
      ready.value = true;
    } catch {
      error.value = '保存データの移行に失敗したため編集を停止しました。元のデータは保持されています。';
    }
  })();
});
onBeforeUnmount(() => { subscription?.unsubscribe(); repository.close(); });
async function act(work: () => Promise<unknown>, success?: string): Promise<void> {
  error.value = ''; notice.value = '';
  try { await work(); if (success) notice.value = success; }
  catch { error.value = '操作できませんでした。内容が別の画面で変更された場合は、もう一度確認してください。'; }
}
async function add(kind: 'clock' | 'color'): Promise<void> { await act(() => repository.add(kind, defaults[kind])); }
async function openStandalone(): Promise<void> {
  await act(async () => { await repository.standalone('color', defaults.color); screen.value = 'standalone'; });
}
async function move(p: Placement, direction: -1 | 1): Promise<void> {
  await act(() => repository.movePlacement(ordered.value, p.placementId, direction));
}
async function selectRemoval(p: Placement): Promise<void> {
  dialogOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  await act(async () => { removal.value = await repository.previewRemoval(p.placementId); removeMode.value = 'detach'; downloaded.value = false; saved.value = false; await nextTick(); dialog.value?.focus(); });
}
function closeRemoval(): void { removal.value = null; void nextTick(() => dialogOpener?.focus()); }
function trapDialog(event: KeyboardEvent): void {
  if (event.key === 'Escape') { closeRemoval(); return; }
  if (event.key !== 'Tab' || !dialog.value) return;
  const focusable = [...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
  const first = focusable[0]; const last = focusable.at(-1);
  if (!first || !last) { event.preventDefault(); return; }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
function download(): void {
  if (!removal.value) return;
  try {
    const text = serializeRemoval(removal.value);
    parseExport(text);
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'tool-dashboard-export.json'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    downloaded.value = true;
    saved.value = false;
  } catch { error.value = 'エクスポートを作成できませんでした。データは削除されていません。'; }
}
function downloadRaw(raw: string): void {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'tool-dashboard-opaque-backup.json'; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function confirmRemoval(): Promise<void> {
  const preview = removal.value;
  if (!preview || (removeMode.value === 'export' && (!downloaded.value || !saved.value))) return;
  await act(async () => { await repository.remove(preview, removeMode.value === 'detach' ? 'detach' : 'delete'); closeRemoval(); }, '操作が完了しました。');
}
async function selectImport(event: Event): Promise<void> {
  imported.value = null;
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  await act(async () => {
    const raw = await file.text();
    const header: unknown = JSON.parse(raw);
    const future = typeof header === 'object' && header !== null && 'format' in header && header.format === 'tool-dashboard-export' && 'exportVersion' in header && typeof header.exportVersion === 'number' && Number.isSafeInteger(header.exportVersion) && header.exportVersion > 3;
    const legacy = typeof header === 'object' && header !== null && 'version' in header && header.version === 1 && 'pages' in header;
    const inspection = future || legacy ? null : inspectExport(raw);
    const envelope = legacy ? previewLegacyBoard(raw) : inspection?.kind === 'supported' ? inspection.envelope : null;
    imported.value = { raw, kind: future ? 'future' : legacy ? 'legacy' : inspection?.kind === 'opaque' ? 'opaque' : 'current', summary: envelope ? `配置 ${envelope.placements.length}件、設定 ${envelope.configs.length}件、データ対象 ${envelope.targets.length}件` : '未対応の形式' };
  });
  target.value = '';
}
async function confirmImport(): Promise<void> {
  const selection = imported.value;
  if (!selection) return;
  await act(async () => {
    if (selection.kind === 'future') {
      await saveOpaqueImport(repository, selection.raw);
      notice.value = '未対応ファイルを展開せず、原文のまま保存しました。';
    } else if (selection.kind === 'legacy') {
      await importLegacyBoard(repository, selection.raw);
      notice.value = '旧ボードを読み取り専用でインポートしました。';
    } else {
      const outcome = await importText(repository, selection.raw);
      notice.value = outcome === 'opaque' ? '未対応のデータ対象が含まれるため、展開せず原文のまま保存しました。' : 'インポートしました。';
    }
    imported.value = null;
  });
}
</script>

<template>
  <main class="shell">
    <header class="header">
      <div>
        <div class="eyebrow">
          TOOL DASHBOARD
        </div><h1>マイボード</h1><p>ツールと設定はこのブラウザに保存されます。</p>
      </div>
      <nav
        aria-label="表示切替"
        class="controls"
      >
        <button
          type="button"
          :disabled="!ready"
          :aria-pressed="screen === 'board'"
          @click="screen = 'board'"
        >
          ボード
        </button>
        <button
          type="button"
          :disabled="!ready"
          :aria-pressed="screen === 'standalone'"
          @click="openStandalone"
        >
          単独ツール
        </button>
      </nav>
    </header>
    <p
      v-if="error && !removal"
      role="alert"
      class="error"
    >
      {{ error }}
    </p>
    <p
      v-if="notice"
      role="status"
    >
      {{ notice }}
    </p>
    <template v-if="ready && screen === 'board'">
      <div class="toolbar">
        <div
          class="controls"
          aria-label="ツールを追加"
        >
          <button
            type="button"
            @click="add('clock')"
          >
            時計を追加
          </button>
          <button
            type="button"
            @click="add('color')"
          >
            カラーを追加
          </button>
        </div>
        <button
          type="button"
          class="secondary"
          :aria-pressed="edit"
          @click="edit = !edit"
        >
          {{ edit ? '編集を終了' : '編集モード' }}
        </button>
      </div>
      <p v-if="!ordered.length">
        ツールを追加してボードを始めましょう。
      </p>
      <div class="board">
        <section
          v-for="(placement, index) in ordered"
          :key="placement.placementId"
          class="panel"
          :class="{ wide: placement.width === 2 }"
        >
          <template v-if="configMap.get(`instance:${placement.instanceId}`)">
            <h2>{{ configMap.get(`instance:${placement.instanceId}`)?.kind === 'clock' ? '時計' : configMap.get(`instance:${placement.instanceId}`)?.kind === 'color' ? 'カラー変換' : '未対応のツール' }}</h2>
            <ToolView
              :config="configMap.get(`instance:${placement.instanceId}`)!"
              :repository="repository"
              :label="placement.placementId"
            />
          </template>
          <p v-else>
            設定が見つかりません。データは保持されています。
          </p>
          <div
            v-if="edit"
            class="controls edit-controls"
            :aria-label="`配置 ${index + 1} の編集`"
          >
            <button
              type="button"
              class="secondary"
              :disabled="index === 0"
              @click="move(placement, -1)"
            >
              前へ
            </button>
            <button
              type="button"
              class="secondary"
              :disabled="index === ordered.length - 1"
              @click="move(placement, 1)"
            >
              後へ
            </button>
            <button
              type="button"
              class="secondary"
              @click="act(() => repository.updatePlacement(placement.placementId, placement.revision, placement.position, placement.width === 1 ? 2 : 1))"
            >
              {{ placement.width === 1 ? '幅を広げる' : '幅を狭める' }}
            </button>
            <button
              type="button"
              class="secondary"
              @click="selectRemoval(placement)"
            >
              取り外し・削除
            </button>
          </div>
        </section>
      </div>
      <section
        v-if="unplaced.length"
        class="panel"
        aria-labelledby="saved-title"
      >
        <h2 id="saved-title">
          保存済みのツール
        </h2>
        <ul>
          <li
            v-for="config in unplaced"
            :key="config.key"
          >
            {{ config.kind }} <button
              type="button"
              class="secondary"
              @click="act(() => repository.restore(config.key.slice('instance:'.length)))"
            >
              ボードに戻す
            </button>
          </li>
        </ul>
      </section>
      <section
        class="panel"
        aria-labelledby="import-title"
      >
        <h2 id="import-title">
          バックアップの復元
        </h2>
        <label for="import-file">エクスポートファイルを選択</label><input
          id="import-file"
          type="file"
          accept="application/json,.json"
          @change="selectImport"
        >
        <div v-if="imported">
          <p v-if="imported.kind === 'future'">
            未対応の新しい形式です。展開せず原文を保存します。
          </p><p v-else-if="imported.kind === 'opaque'">
            未対応のデータ対象が含まれます。展開せず原文を保存します。
          </p><p v-else-if="imported.kind === 'legacy'">
            旧ボードを読み取り専用で復元します。配置は近似し、元のレイアウトと原文を保持します。
          </p><p v-else>
            ファイルを検証しました。取り込み前に現在のデータとの重複を確認します。
          </p><p>{{ imported.summary }}</p><button
            type="button"
            @click="confirmImport"
          >
            インポートする
          </button><button
            type="button"
            class="secondary"
            @click="imported = null"
          >
            キャンセル
          </button>
        </div>
      </section>
      <section
        v-if="opaqueImports.length"
        class="panel"
        aria-labelledby="opaque-title"
      >
        <h2 id="opaque-title">
          原文のバックアップ
        </h2>
        <p>未対応の情報を含むファイルは原文を保持しています。</p>
        <ul>
          <li
            v-for="item in opaqueImports"
            :key="item.id"
          >
            {{ item.id }} <button
              type="button"
              class="secondary"
              @click="downloadRaw(item.raw)"
            >
              原文をダウンロード
            </button>
          </li>
        </ul>
      </section>
    </template>
    <section
      v-else-if="ready"
      class="panel"
      aria-labelledby="standalone-title"
    >
      <h2 id="standalone-title">
        カラー変換（単独ツール）
      </h2>
      <ToolView
        v-if="configMap.get('standalone:color')"
        :config="configMap.get('standalone:color')!"
        :repository="repository"
        label="standalone-color"
      />
    </section>
    <section
      v-if="removal"
      ref="dialog"
      class="modal-backdrop"
      aria-labelledby="remove-title"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      @keydown="trapDialog"
    >
      <div class="panel modal">
        <h2 id="remove-title">
          ツールを取り外す
        </h2>
        <p
          v-if="error"
          role="alert"
          class="error"
        >
          {{ error }}
        </p>
        <p>対象: {{ removal.config.kind }} / {{ removal.placement.placementId }}</p>
        <p>対象の配置: 1件、設定: 1件、関連データ: {{ removal.records.length }}件。</p>
        <p>設定 ID: {{ removal.config.key }} / データ対象: {{ removal.config.targetRef ? JSON.stringify(removal.config.targetRef) : 'なし' }}</p>
        <p v-if="removal.records.length">
          関連レコード: {{ removal.records.map(record => record.id).join(', ') }}
        </p>
        <p
          v-if="removal.shared"
          class="warning"
        >
          この設定またはデータは他の表示から参照されています。共有データは保持されます。参照: {{ removal.references.join(', ') }}
        </p>
        <fieldset>
          <legend>操作を選択</legend>
          <label><input
            v-model="removeMode"
            type="radio"
            value="detach"
          > ボードから外し、設定とデータを残す</label>
          <label><input
            v-model="removeMode"
            type="radio"
            value="export"
          > エクスポートしてから削除</label>
          <label><input
            v-model="removeMode"
            type="radio"
            value="delete"
          > このツールと専有データを削除</label>
        </fieldset>
        <template v-if="removeMode === 'export'">
          <button
            type="button"
            @click="download"
          >
            エクスポートを保存
          </button><label v-if="downloaded"><input
            v-model="saved"
            type="checkbox"
          > エクスポートファイルを保存したことを確認しました</label><p>保存の確認後、変更がない場合のみ削除します。</p>
        </template>
        <p v-if="removeMode === 'delete'">
          この配置と、他の配置が使っていない設定および専有データを削除します。
        </p>
        <div class="controls">
          <button
            type="button"
            :disabled="removeMode === 'export' && (!downloaded || !saved)"
            @click="confirmRemoval"
          >
            選択した操作を確定
          </button><button
            type="button"
            class="secondary"
            @click="closeRemoval"
          >
            キャンセル
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
