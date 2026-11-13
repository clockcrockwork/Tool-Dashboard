/** Semantic UI parts and typed change intents never contain executable code. */
export type DraftFieldKey<TDraft extends object> = Extract<keyof TDraft, string>;
export type DataKey<TData extends object> = Extract<keyof TData, string>;
export type PartRegion = 'input' | 'controls' | 'result' | 'status' | 'settings';

type DraftFieldPart<TDraft extends object> = {
  [K in DraftFieldKey<TDraft>]: {
    readonly id: string;
    readonly kind: 'field';
    readonly region: 'input';
    readonly draftKey: K;
    readonly changeIntentId: `change:${K}`;
  }
}[DraftFieldKey<TDraft>];

export type Part<TCommitted extends object, TDraft extends object, TActionId extends string> =
  | DraftFieldPart<TDraft>
  | { readonly id: string; readonly kind: 'action'; readonly region: 'controls'; readonly actionId: TActionId }
  | { readonly id: string; readonly kind: 'result'; readonly region: 'result'; readonly dataKey: DataKey<TCommitted> }
  | { readonly id: string; readonly kind: 'feedback'; readonly region: 'status' }
  | { readonly id: string; readonly kind: 'custom'; readonly region: PartRegion; readonly componentId: string };

export type DraftChange<TDraft extends object> = {
  [K in DraftFieldKey<TDraft>]: { readonly type: `change:${K}`; readonly value: TDraft[K] }
}[DraftFieldKey<TDraft>];

export type UiIntent<TDraft extends object, TActionId extends string> =
  | DraftChange<TDraft>
  | { readonly type: TActionId };
