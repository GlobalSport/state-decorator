/*! *****************************************************************************
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
import isEqual from 'fast-deep-equal';
import { CloneFunction, globalConfig, isSimpleSyncAction } from './impl';

function getNoopMiddleware<S, A extends DecoratedActions, P>(): Middleware<S, A, P> {
  const middleware: Middleware<S, A, P> = {
    init: () => {},
    destroy: null,
    effects: () => null,
  };

  return middleware;
}

export function logEffects<S, A extends DecoratedActions, P>(
  log: (...msg: any[]) => void = console.log
): MiddlewareFactory<S, A, P> {
  const f = () => {
    const logger = log;
    let storeName = '';

    const middleware: Middleware<S, A, P> = {
      init: (storeContext) => {
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          storeName = storeContext.options?.name ? `[${storeContext.options?.name}]` : '';
          const newState = storeContext.state;
          logger(storeName, 'initialState', newState);
        }
      },
      destroy: null,
      effects: (action, _oldState, newState, loading: boolean) => {
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          logger(
            storeName,
            action.name,
            action.type,
            newState === null ? 'no effect' : newState,
            action.isAsync
              ? action.type === 'preEffects' && !loading
                ? 'Promise cancelled'
                : `loading: ${loading}`
              : ''
          );
        }
        return null;
      },
    };
    return middleware;
  };

  return f;
}

export type Logger = {
  log: (...args: any[]) => void;
  group: (...args: any[]) => void;
  groupCollapsed: (...args: any[]) => void;
  groupEnd: (...args: any[]) => void;
};

export function logDetailedEffects<S, A extends DecoratedActions, P>(
  logger: Logger = console
): MiddlewareFactory<S, A, P> {
  return () => {
    let storeName = '';

    const console = logger;

    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      const computeDiffPropValue = (oldValue: any, newValue: any) => {
        let res: any;
        if (newValue !== oldValue) {
          const type = oldValue != null ? typeof oldValue : typeof newValue;
          if (type === 'number' || type === 'string' || type === 'boolean') {
            res = `${oldValue} => ${newValue === '' ? '""' : newValue}`;
          } else if ((oldValue && oldValue.length) || (newValue && newValue.length)) {
            if (oldValue == null) {
              res = `was ${oldValue}, now contains ${newValue.length} element(s)`;
            } else if (newValue == null) {
              res = `contained ${oldValue.length} element(s), now is ${newValue}`;
            } else if (oldValue.length === 0) {
              res = `was empty, now contains ${newValue.length} elements`;
            } else if (newValue.length === 0) {
              res = `contained ${oldValue.length} elements, now is empty`;
            } else {
              let addedValues = newValue.filter((a: any) => !oldValue.find((b: any) => isEqual(a, b)));
              let removedValues = oldValue.filter((a: any) => !newValue.find((b: any) => isEqual(a, b)));

              if (addedValues.length > 10) {
                addedValues = `${addedValues.length} element(s) added`;
              }
              if (removedValues.length > 10) {
                removedValues = `${removedValues.length} element(s) removed`;
              }
              res = {
                added: addedValues,
                removed: removedValues,
              };
            }
          } else {
            res = newValue;
          }
        }
        return res;
      };

      const buildDiff = <S>(oldState: S, newState: S) => {
        const res: Record<string, any> = {};

        if (process.env.NODE_ENV === 'development') {
          if (oldState) {
            const keys = Object.keys(oldState) as (keyof S)[];
            keys.forEach((k) => {
              if (newState.hasOwnProperty(k)) {
                const oldValue = oldState[k];
                const newValue = newState[k];
                const diff = computeDiffPropValue(oldValue, newValue);
                if (diff) {
                  res[k as any] = diff;
                }
              } else {
                res[k as any] = 'was deleted';
              }
            });
          }

          const keys = Object.keys(newState) as (keyof S)[];
          keys.forEach((k) => {
            if (oldState == null || !oldState.hasOwnProperty(k)) {
              const newValue = newState[k];

              res[k as any] = computeDiffPropValue(undefined, newValue);
            }
          });
        }

        return res;
      };

      const getStr = (v: any) => {
        if (typeof v === 'string') {
          return `"${v}"`;
        }
        return v;
      };

      const middleware: Middleware<S, A, P> = {
        init: (storeContext) => {
          storeName = storeContext.options?.name ? `[${storeContext.options?.name}]` : '';
          const newState = storeContext.state;
          logger.group(storeName, 'initialState');
          const keys = Object.keys(newState) as (keyof S)[];
          keys.forEach((prop) => void console.log(prop, ':', getStr(newState[prop])));
          logger.groupEnd();
        },
        destroy: null,
        effects: (action, oldState, newState, loading) => {
          const args: any[] = action.context?.args;

          const params: string[] = [storeName, action.name.toString()];

          if (action.isAsync) {
            if (action.type === 'preEffects') {
              params.push(loading ? 'START' : 'CANCELLED');
            } else if (action.type === 'effects') {
              params.push('DONE');
            } else {
              params.push('FAILED');
            }
          }

          if (newState == null && (!args || Object.keys(args).length === 0)) {
            console.log(...params);
          } else {
            console.group(...params);
          }

          if (args && Object.keys(args).length > 0) {
            console.group('Arguments');
            args.forEach((arg) => void console.log(arg, ':', getStr(arg)));
            console.groupEnd();
          }

          if (newState != null) {
            console.groupCollapsed('Before');
            if (oldState == null) {
              console.log('was null');
            } else {
              const keys = Object.keys(oldState) as (keyof S)[];
              keys.forEach((prop) => void console.log(prop, ':', getStr(oldState[prop])));
            }
            console.groupEnd();

            console.groupCollapsed('After');
            if (newState == null) {
              console.log('was null');
            } else {
              const keys = Object.keys(newState) as (keyof S)[];
              keys.forEach((prop) => void console.log(prop, ':', getStr(newState[prop])));
            }
            console.groupEnd();

            if (newState != null) {
              console.group('Diff');
              const diff = buildDiff(oldState, newState);
              Object.keys(diff).forEach((prop) => console.log(prop, ':', diff[prop]));
              console.groupEnd();
            }
          }
          //
          console.groupEnd();

          return null;
        },
      };
      return middleware;
    }

    const middleware = getNoopMiddleware<S, A, P>();
    return middleware;
  };
}

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
      return `${name}_${promiseId}`;
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
          state = (onPropsChanges[ctx.index].effects as any)(ctx);
        } else if (isSimpleSyncAction(storeContext.actions[action.actionName])) {
          state = (storeContext.actions[action.actionName] as any)(ctx);
        } else {
          state = (storeContext.actions[action.actionName] as any)[action.effectType](ctx);
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
              state: action.optimisticEffects({
                ...(context as any),
                state,
                s: state,
              }),
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

export function devtools<S, A extends DecoratedActions, P>(): MiddlewareFactory<S, A, P> {
  const getMiddleware = () => {
    let extension: any;
    try {
      extension = (window as any).__REDUX_DEVTOOLS_EXTENSION__ || (window as any).top.__REDUX_DEVTOOLS_EXTENSION__;
    } catch {}

    if (!extension) {
      return getNoopMiddleware<S, A, P>();
    }

    let devtools: any;
    let unsubscribe: () => void;

    const middleware: Middleware<S, A, P> = {
      init(storeContext) {
        devtools = extension.connect({ name: storeContext.options?.name ?? 'StateDecorator' });
        devtools.init(storeContext.state);
        let savedState: S = null;
        const initialState: S = storeContext.state;

        unsubscribe = devtools.subscribe((message: any) => {
          if (message.type === 'DISPATCH' && message.state && message.payload?.type !== 'ROLLBACK') {
            const newState = JSON.parse(message.state);
            storeContext.setState(newState);
          } else if (message.payload?.type === 'COMMIT') {
            savedState = storeContext.state;
          } else if (message.payload?.type === 'ROLLBACK') {
            if (savedState != null) {
              storeContext.setState(savedState);
            }
          } else if (message.payload?.type === 'RESET') {
            storeContext.setState(initialState);
          }
        });
      },

      effects(ctx, _oldState, newState) {
        if (newState != null) {
          const cleanCtx: any = {
            ...ctx.context,
          };

          delete cleanCtx.a;
          delete cleanCtx.s;
          delete cleanCtx.p;
          delete cleanCtx.res;
          delete cleanCtx.err;
          delete cleanCtx.ds;

          devtools.send(
            {
              type: `${ctx.name} ${ctx.type}`,
              args: cleanCtx.args,
              context: cleanCtx,
            },
            newState
          );
        }

        return null; // no op on state
      },

      destroy() {
        unsubscribe();
        devtools = null;
      },
    };

    return middleware;
  };

  return getMiddleware;
}
