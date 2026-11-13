import type { LocalRepository } from './local-repository';
import { parseHex } from '../tools/color/definition';

export class InvalidDraft extends Error {}
export type ColorResult = { r: number; g: number; b: number };

/** Host application service: validate a snapshot, execute, then commit with CAS. */
export async function submitTool(repository: LocalRepository, request: {
  kind: string; key: string; revision: number; value: string; isCurrent: () => boolean;
}): Promise<{ revision: number; result: ColorResult | null } | null> {
  let result: ColorResult | null = null;
  if (request.kind === 'color') {
    const args = parseHex.inputSchema.safeParse({ hex: request.value });
    if (!args.success) throw new InvalidDraft('6桁のHEXカラーを入力してください。');
    result = await parseHex.run(args.data);
  } else if (request.kind === 'clock') {
    if (!request.value) throw new InvalidDraft('タイムゾーンを入力してください。');
    try { new Intl.DateTimeFormat('en', { timeZone: request.value }); }
    catch { throw new InvalidDraft('有効なタイムゾーンを入力してください。'); }
  } else throw new InvalidDraft('未対応のツールです。');
  if (!request.isCurrent()) return null;
  const saved = await repository.updateConfig(request.key, request.revision, { value: request.value });
  return { revision: saved.revision, result };
}
