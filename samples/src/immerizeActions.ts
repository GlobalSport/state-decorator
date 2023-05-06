import produce from 'immer';
import { isAsyncAction, isSimpleSyncAction } from './sd/impl';
import { DecoratedActions, StoreActions } from './sd';

function immerifyEffects<S, Ctx extends { state: S; s: S }>(effects: (ctx: Ctx) => void): (ctx: Ctx) => S {
  return ((ctx) =>
    produce(ctx.state, (state) => {
      effects({ ...ctx, state, s: state });
    })) as (ctx: Ctx) => S;
}

export function immerizeActions<S, A extends DecoratedActions, P>(
  actions: StoreActions<S, A, P, void>
): StoreActions<S, A, P, S> {
  const keys: (keyof A)[] = Object.keys(actions);
  return keys.reduce((acc, actionName) => {
    const baseAction = actions[actionName] as any;

    if (isAsyncAction(baseAction)) {
      const newAction: any = { ...baseAction };
      const effects = ['effects', 'preEffects', 'errorEffects', 'optimisticEffects'];
      effects.forEach((effects) => {
        if (baseAction[effects]) {
          newAction[effects] = immerifyEffects(baseAction[effects]);
        }
      });
      acc[actionName] = newAction;
    } else if (isSimpleSyncAction(baseAction)) {
      acc[actionName] = immerifyEffects(baseAction as any);
    } else {
      const newAction: any = { ...baseAction };
      const effects = ['effects'];
      effects.forEach((effects) => {
        if (baseAction[effects]) {
          newAction[effects] = immerifyEffects(baseAction[effects]);
        }
      });
      acc[actionName] = newAction;
    }

    return acc;
  }, {} as StoreActions<S, A, P, S>);
}

// // EXAMPLE

// type MyState = {
//   list: string[];
// };

// type MyActions = {
//   loadList: (p: string) => void;
// };

// const actions: StoreActions<MyState, MyActions> = immerizeActions({
//   loadList: ({ s, args: [param] }) => {
//     s.list.push(param);
//   },
// });
