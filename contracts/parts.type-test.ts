import type { Part, UiIntent } from '../src/core/parts';

type Draft = { hex: string; count: number };
type Committed = { rgb: string };
type Actions = 'submit';

const goodField: Part<Committed, Draft, Actions> = {
  id: 'hex', kind: 'field', region: 'input', draftKey: 'hex', changeIntentId: 'change:hex',
};
const goodAction: UiIntent<Draft, Actions> = { type: 'change:count', value: 2 };
void goodField;
void goodAction;

// @ts-expect-error nonexistent draft key must fail typecheck
const unknownField: Part<Committed, Draft, Actions> = { id: 'bad', kind: 'field', region: 'input', draftKey: 'missing', changeIntentId: 'change:missing' };
// @ts-expect-error wrong typed field value must not silently coerce
const wrongValue: UiIntent<Draft, Actions> = { type: 'change:count', value: '2' };
// @ts-expect-error undeclared action cannot reach the application service
const wrongAction: UiIntent<Draft, Actions> = { type: 'delete' };
void unknownField;
void wrongValue;
void wrongAction;
