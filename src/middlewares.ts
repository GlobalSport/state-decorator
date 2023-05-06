/* ! *****************************************************************************
Copyright (c) GlobalSport SAS.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

import type {
  AsyncAction,
  DecoratedActions,
  EffectsType,
  Middleware,
  MiddlewareFactory,
  MiddlewareStoreContext,
} from './types';
import { CloneFunction, globalConfig, isSimpleSyncAction } from './impl';

// ------------------------------
//
// Optimistic
//
// ------------------------------

type ActionHistory<S, A> = {
  actionName: keyof A;
  promiseId: string;
  effectType: EffectsType;
  ctx: any;
  // FIXME CTX ?
  beforeEffectState: S;
};

type OptimisticActionsMap = {
  [name: string]: any;
};

type OptimisticData<S, A> = {
  /** History of effects */
  history: ActionHistory<S, A>[];
  /** Map of ongoing optimistic actions */
  optimisticActions: OptimisticActionsMap;
  /** Whether or not record all effects */
  shouldRecordHistory: boolean;
};

export function optimisticActions<S, A extends DecoratedActions, P>(
  cloneFunc?: CloneFunction
): MiddlewareFactory<S, A, P> {
  function getMiddleWare() {
    let storeContext: MiddlewareStoreContext<S, A, P> = null;

    const optimisticData: OptimisticData<S, A> = {
      history: null,
      optimisticActions: {},
      shouldRecordHistory: false,
    };

    const clone = (obj: any) => {
      const f = cloneFunc || globalConfig.clone;
      return f(obj);
    };

    const getActionId = (name: keyof A, promiseId: string) => {
      return `${name.toString()}_${promiseId}`;
    };

    /**
     * Adds an action to the action history (only when at least one optimistic action is ongoing).
     * @param actionName The action name
     * @param reducer The reducer name
     * @param args The arguments of the action (will be cloned)
     * @param beforeState state before the optimistic action
     */
    function pushActionToHistory(actionName: keyof A, effectType: EffectsType, ctx: any, beforeState: S = null): void {
      const { shouldRecordHistory } = optimisticData;
      const { history } = optimisticData;

      if (shouldRecordHistory) {
        if (history === null) {
          optimisticData.history = [];
        }

        const clonedCtx = clone(ctx);
        delete clonedCtx.state;
        delete clonedCtx.s;
        delete clonedCtx.abortSignal;
        // error clone issue
        clonedCtx.error = ctx.err;
        clonedCtx.err = ctx.err;

        const newEntry: ActionHistory<S, A> = {
          effectType,
          actionName,
          promiseId: ctx.promiseId,
          // fixme remove actions etc etc
          ctx: clonedCtx,
          beforeEffectState: beforeState ? clone(beforeState) : null,
        };

        optimisticData.history.push(newEntry);
      }
    }

    /**
     * Undo the optimistic action.
     * Strategy:
     *  - Get the state before the optimistic reducer
     *  - Replay all actions that occured after the optimistic action.
     * @param actionName The action name.
     */
    function undoOptimisticAction(actionName: keyof A, promiseId: string) {
      const { history } = optimisticData;

      // find the optimistic action in the history
      const index = history.findIndex(
        (a) => a.effectType === 'optimisticEffects' && a.actionName === actionName && a.promiseId === promiseId
      );

      // find the state at the time of the optimistic action.
      let state = history[index].beforeEffectState;

      // +1 to skip undo action
      for (let i = index + 1; i < history.length; i++) {
        const action = history[i];

        // This is an optimistic action, update restore state
        if (action.beforeEffectState) {
          action.beforeEffectState = state;
        }

        const ctx = {
          ...action.ctx,
          state,
          s: state,
        };

        if (action.actionName === 'onPropsChange') {
          const onPropsChanges = Array.isArray(storeContext.options.onPropsChange)
            ? storeContext.options.onPropsChange
            : [storeContext.options.onPropsChange];
          state = { ...state, ...(onPropsChanges[ctx.index].effects as any)(ctx) };
        } else if (isSimpleSyncAction(storeContext.actions[action.actionName])) {
          state = { ...state, ...(storeContext.actions[action.actionName] as any)(ctx) };
        } else {
          state = { ...state, ...(storeContext.actions[action.actionName] as any)[action.effectType](ctx) };
        }
      }

      // clean up
      cleanHistoryAfterOptimistAction(actionName, promiseId, index);

      return state;
    }

    function cleanHistoryAfterOptimistAction(
      actionName: keyof A,
      promiseId: string,
      indexInHistory: number = undefined
    ): void {
      const { optimisticActions, history } = optimisticData;

      const actionId = getActionId(actionName, promiseId);

      delete optimisticActions[actionId];

      const optiStateKeys = Object.keys(optimisticActions) as (keyof A)[];

      if (optiStateKeys.length === 0) {
        optimisticData.history = null;
        optimisticData.shouldRecordHistory = false;
      } else {
        const index =
          indexInHistory === undefined
            ? history.findIndex((a) => getActionId(a.actionName, a.promiseId) === actionId)
            : indexInHistory;

        if (index === 0) {
          // this was the first optimist action, so find the next one
          const nextOptimisticIndex = history.slice(1).findIndex((a) => a.beforeEffectState != null) + 1;

          // forget actions before the first optimist action in the history
          history.splice(0, nextOptimisticIndex);
        } else if (indexInHistory === undefined) {
          // success use case.
          // this was not the first optimist action, but can forget the saved state.
          // it becomes an asynchronous action.
          history[index].beforeEffectState = null;
        }
      }
    }

    // FIXME test destroy + init
    const middleware: Middleware<S, A, P> = {
      init(ctx) {
        storeContext = ctx;
      },
      destroy() {
        storeContext = null;
        optimisticData.history = null;
        optimisticData.optimisticActions = {};
        optimisticData.shouldRecordHistory = false;
      },
      effects({ name, type, context, isAsync }, oldState, newState, loading) {
        // add effect to the history if needed

        if (
          (newState != null && isSimpleSyncAction(storeContext.actions[name])) ||
          name === 'onPropsChange' ||
          (storeContext.actions[name] as any)[type] != null
        ) {
          pushActionToHistory(name, type, context, null);
        }

        if (isAsync) {
          // can cast
          const action = (storeContext.actions[name] as any) as AsyncAction<S, any, any, A, P>;

          // promise is sent and action is optimistic
          if (loading && action.optimisticEffects != null && type === 'preEffects') {
            optimisticData.shouldRecordHistory = true;
            optimisticData.optimisticActions[getActionId(name, context.promiseId)] = true;
            const state = newState || oldState;
            pushActionToHistory(name, 'optimisticEffects', context, state);
            return {
              loading: false,
              state: {
                ...state,
                ...action.optimisticEffects({
                  ...(context as any),
                  state,
                  s: state,
                }),
              },
            };
          }
          // The promise was successful
          if (action.optimisticEffects != null && type === 'effects') {
            cleanHistoryAfterOptimistAction(name, context.promiseId);
            return {
              loading,
              state: newState,
            };
          }

          // The promise failed
          if (action.optimisticEffects != null && type === 'errorEffects') {
            const state = undoOptimisticAction(name, context.promiseId);
            return {
              state,
              loading,
            };
          }
        }

        // else no-op
        return null;
      },
    };
    return middleware;
  }
  return getMiddleWare;
}
