/** A mounted view may have an editable draft of a provider's committed target. */
export type UiStatus =
  | { readonly phase: 'idle' }
  | { readonly phase: 'working'; readonly invocationId: string; readonly progress?: number }
  | { readonly phase: 'ready' }
  | { readonly phase: 'error'; readonly code: string; readonly message: string };

export type ViewModel<TCommitted extends object, TDraft extends object> = Readonly<{
  kind: string;
  committed: Readonly<TCommitted>;
  committedRevision?: string;
  draft: Readonly<TDraft>;
  baseRevision?: string;
  isDirty: boolean;
  hasExternalChange: boolean;
  status: UiStatus;
  feedback: readonly { readonly kind: 'info' | 'warning' | 'error'; readonly text: string }[];
}>;
