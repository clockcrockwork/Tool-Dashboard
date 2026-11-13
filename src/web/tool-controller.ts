import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { isSupportedConfig, type Config, type LocalRepository } from './local-repository';
import { InvalidDraft, submitTool, type ColorResult } from './tool-service';
import type { UiIntent } from '../core/parts';

export function useToolController(props: { readonly config: Config; readonly repository: LocalRepository }) {
type Draft = { value: string };
type Intent = UiIntent<Draft, 'submit' | 'reload'>;
const readValue = (config: Config): string => {
  const value: unknown = config.value;
  if (typeof value !== 'object' || value === null) return '';
  if ('value' in value && typeof value.value === 'string') return value.value;
  return '';
};
const draft = ref(readValue(props.config));
const baseRevision = ref(props.config.revision);
const dirty = ref(false);
const error = ref('');
const result = ref<ColorResult | null>(null);
const now = ref(new Date());
const conflict = computed(() => dirty.value && baseRevision.value !== props.config.revision);
const supported = computed(() => isSupportedConfig(props.config));
let invocation = 0;
let ownRevision: number | undefined;
const timer = window.setInterval(() => { now.value = new Date(); }, 1000);
onBeforeUnmount(() => { invocation++; window.clearInterval(timer); });
watch(() => props.config, config => {
  if (!dirty.value) {
    draft.value = readValue(config);
    baseRevision.value = config.revision;
    if (config.revision !== ownRevision) result.value = null;
  }
});
const time = computed(() => {
  try { return new Intl.DateTimeFormat(undefined, { timeZone: readValue(props.config) || 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now.value); }
  catch { return '設定されたタイムゾーンを表示できません'; }
});
async function send(intent: Intent): Promise<void> {
  if (intent.type === 'change:value') {
    draft.value = intent.value;
    dirty.value = true;
    error.value = '';
    result.value = null;
    invocation++;
    return;
  }
  if (intent.type === 'reload') {
    invocation++;
    draft.value = readValue(props.config);
    baseRevision.value = props.config.revision;
    dirty.value = false;
    error.value = '';
    return;
  }
  const current = ++invocation;
  const value = draft.value;
  const revision = baseRevision.value;
  error.value = '';
  try {
    const saved = await submitTool(props.repository, { kind: props.config.kind, key: props.config.key, revision, value, isCurrent: () => current === invocation });
    if (!saved || current !== invocation) return;
    ownRevision = saved.revision;
    baseRevision.value = saved.revision;
    dirty.value = false;
    result.value = saved.result;
  } catch (cause) {
    if (current === invocation) error.value = cause instanceof InvalidDraft ? cause.message : '保存できませんでした。別の画面で変更された場合は最新の設定を読み込んでください。';
  }
}

return { draft, error, result, conflict, supported, time, send };
}
