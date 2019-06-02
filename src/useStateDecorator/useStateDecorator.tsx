/*
 * Copyright 2019 Globalsport SAS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React, { useReducer, useMemo, useRef, useEffect } from 'react';
import fastClone from 'fast-clone';

import {
  SynchAction,
  DecoratedActions,
  StateDecoratorActions,
  LoadingMap,
  LoadingMapParallelActions,
  PromiseResult,
  AdvancedSynchAction,
  ConflictPolicy,
  ConflictActionsMap,
  AsynchActionPromise,
} from '../types';
import {
  logStateChange,
  isSyncAction,
  isAsyncAction,
  computeAsyncActionInput,
  toMap,
  isAdvancedSyncAction,
  logSingle,
  retryDecorator,
  areSameArgs,
} from '../base';

type HookState<S, A> = {
  state: S;
  sideEffectRender: number;
  loadingMap: LoadingMap<A>;
  loadingParallelMap: LoadingMapParallelActions<A>;
};

type SideEffect<S> = (s: S) => void;

type DebounceMap = {
  [name: string]: any;
};

export enum ReducerActionType {
  ON_PROP_CHANGE_REDUCER,
  ACTION,
}

export enum ReducerActionSubType {
  BEFORE_PROMISE,
  SUCCESS,
  ERROR,
}

export type ReducerAction<F extends (...args: any[]) => any, P> = {
  type: ReducerActionType;
  args: Parameters<F>;
  result?: any;
  promiseId?: string;
  error?: any;
  props: P;
  actionName?: string;
  subType?: ReducerActionSubType;
};

export type StateDecoratorOptions<S, A> = {
  /**
   * Show logs in the console in development mode.
   */
  logEnabled?: boolean;

  /**
   * Get a list of values that will be use as reference values.
   * If they are different (shallow compare), onPropsChangeReducer then onPropsChange will be called.
   */
  getPropsRefValues?: (props: any) => any[];

  /**
   * Triggered when values of reference from props have changed. Allow to update state after a prop change.
   * <b>null</b> means no change.
   */
  onPropsChangeReducer?: (s: S, newProps: any) => S;

  /**
   * Triggered when values of reference from props have changed. Allow to call actions after a prop change.
   */
  onPropsChange?: (s: S, newProps: any, actions: A) => void;

  /**
   * The callback function called if an asynchronous function succeeded and a success messsage is defined.
   */
  notifySuccess?: (message: string) => void;

  /**
   * The callback function called if an asynchronous function fails and an error messsage is defined.
   */
  notifyError?: (message: string) => void;
};

/**
 * Returns a function that decorates the synchronous action.
 * It will dispatch actions for the useReducer.
 */
export function decorateSyncAction<S, F extends (...args: any[]) => any, P>(
  dispatch: React.Dispatch<ReducerAction<F, P>>,
  actionName: string,
  action: SynchAction<S, F, P>,
  propsRef: React.MutableRefObject<P>
) {
  return (...args: Parameters<F>) => {
    dispatch({ actionName, args, props: propsRef.current, type: ReducerActionType.ACTION });
  };
}

/**
 * Stores in the side effect ref a new array that contains the new side effect.
 * @param sideEffectsRef
 */
export function addNewSideEffect<S>(
  sideEffectsRef: React.MutableRefObject<SideEffect<S>[]>,
  newSideEffect: SideEffect<S>
) {
  sideEffectsRef.current.push(newSideEffect);
}

function processAdvancedSyncAction<S, F extends (...args: any[]) => any, A, P>(
  dispatch: React.Dispatch<ReducerAction<F, P>>,
  actionName: string,
  action: AdvancedSynchAction<S, F, A, P>,
  args: Parameters<F>,
  propsRef: React.MutableRefObject<P>,
  actionsRef: React.MutableRefObject<A>,
  sideEffectsRef: React.MutableRefObject<SideEffect<S>[]>,
  options: StateDecoratorOptions<S, A>,
  addSideEffect: typeof addNewSideEffect
) {
  dispatch({ actionName, args, props: propsRef.current, type: ReducerActionType.ACTION });
  if (action.onActionDone) {
    addSideEffect(sideEffectsRef, (s: S) => {
      logSingle(actionName, args, options.logEnabled, 'onActionDone SIDE EFFECT');
      action.onActionDone(s, args as any, propsRef.current, actionsRef.current);
    });
  }
}

/**
 * Returns a function that decorates the synchronous action.
 * It will dispatch actions for the useReducer.
 */
export function decorateAdvancedSyncAction<S, F extends (...args: any[]) => any, A, P>(
  dispatch: React.Dispatch<ReducerAction<F, P>>,
  actionName: string,
  action: AdvancedSynchAction<S, F, A, P>,
  propsRef: React.MutableRefObject<P>,
  actionsRef: React.MutableRefObject<A>,
  sideEffectsRef: React.MutableRefObject<SideEffect<S>[]>,
  options: StateDecoratorOptions<S, A>,
  addSideEffect: typeof addNewSideEffect,
  debounceActionMapRef: React.MutableRefObject<DebounceMap>
) {
  return (...args: Parameters<F>) => {
    if (action.debounceTimeout != null) {
      const debounceActionMap = debounceActionMapRef.current;

      if (debounceActionMap[name] != null) {
        clearTimeout(debounceActionMap[name]);
      }

      debounceActionMap[name] = setTimeout(() => {
        debounceActionMap[name] = null;
        processAdvancedSyncAction(
          dispatch,
          actionName,
          action,
          args,
          propsRef,
          actionsRef,
          sideEffectsRef,
          options,
          addSideEffect
        );
      }, action.debounceTimeout);
    } else {
      processAdvancedSyncAction(
        dispatch,
        actionName,
        action,
        args,
        propsRef,
        actionsRef,
        sideEffectsRef,
        options,
        addSideEffect
      );
    }
  };
}

type CloneFunction = <C>(obj: C) => C;

let cloneFunc: CloneFunction = fastClone;

function clone(obj) {
  try {
    return cloneFunc(obj);
  } catch (e) {
    const msg =
      'useStateDecorator: Cannot clone object. Call setCloneFunction with another implementation like lodash/cloneDeep.';
    if (process.env.NODE_ENV === 'development') {
      console.error(msg);
      console.error(e.toString());
    }
    throw new Error(msg);
  }
}

export function setCloneFunction(cloneFn: CloneFunction) {
  cloneFunc = cloneFn;
}

type PromiseMap = { [name: string]: { promise: Promise<any>; refArgs: any[] } };

function handleConflictingAction(
  promises: PromiseMap,
  conflictActions: ConflictActionsMap,
  logEnabled: boolean,
  actionName: string,
  conflictPolicy: ConflictPolicy,
  args: any[]
) {
  let policy: ConflictPolicy = conflictPolicy;
  if (policy === ConflictPolicy.REUSE) {
    if (areSameArgs(promises[actionName].refArgs, args)) {
      return promises[actionName].promise;
    } // else
    policy = ConflictPolicy.KEEP_ALL;
  }

  return new Promise((resolve, reject) => {
    const futureAction = {
      resolve,
      reject,
      args: clone(args),
      timestamp: Date.now(),
    };

    switch (policy) {
      case ConflictPolicy.IGNORE:
        logSingle(actionName, args, logEnabled, 'Drop request (Conflict policy is IGNORE)');
        resolve();
        break;
      case ConflictPolicy.REJECT:
        logSingle(actionName, args, logEnabled, 'Reject request (Conflict policy is REJECT)');
        reject(new Error(`An asynch action ${actionName} is already ongoing.`));
        break;
      case ConflictPolicy.KEEP_LAST: {
        conflictActions[actionName] = [futureAction];
        break;
      }
      case ConflictPolicy.KEEP_ALL: {
        let stack = conflictActions[actionName];
        if (!stack) {
          conflictActions[actionName] = stack = [];
        }
        stack.push(futureAction);
        break;
      }
      case ConflictPolicy.PARALLEL:
      case ConflictPolicy.REUSE:
        // no-op
        break;
      default:
        // will trigger a compilation error if one of the enum values is not processed.
        const exhaustiveCheck: never = policy;
        exhaustiveCheck;
        break;
    }
  });
}

function processNextConflictAction<A>(actionName: string, actions: A, conflictActions: ConflictActionsMap) {
  const futureActions = conflictActions[actionName];

  if (futureActions && futureActions.length > 0) {
    const futureAction = conflictActions[actionName].shift();

    if (futureAction) {
      const p = actions[actionName](...futureAction.args) as Promise<any>;
      if (p == null) {
        processNextConflictAction(actionName, actions, conflictActions);
      } else {
        p.then(futureAction.resolve).catch((e) => futureAction.reject(e));
      } // else aborted
    }
  }
}

function isTriggerRetryError(error: Error) {
  return error instanceof TypeError;
}

/**
 * Returns a function that decorates the asynchronous action.
 * It will dispatch actions for the useReducer.
 */
export function decorateAsyncAction<S, F extends (...args: any[]) => any, A, P>(
  dispatch: React.Dispatch<ReducerAction<F, P>>,
  actionName: string,
  action: AsynchActionPromise<S, F, A, P>,
  stateRef: React.MutableRefObject<S>,
  propsRef: React.MutableRefObject<P>,
  actionsRef: React.MutableRefObject<A>,
  sideEffectsRef: React.MutableRefObject<SideEffect<S>[]>,
  promisesRef: React.MutableRefObject<PromiseMap>,
  conflictActionsRef: React.MutableRefObject<ConflictActionsMap>,
  options: StateDecoratorOptions<S, A>,
  addSideEffect: typeof addNewSideEffect
) {
  return (...args: Parameters<F>): Promise<any> => {
    const asyncAction = computeAsyncActionInput(action);

    const { conflictPolicy = ConflictPolicy.KEEP_ALL } = action;
    const { current: promises } = promisesRef;

    const isParallel = conflictPolicy === ConflictPolicy.PARALLEL;

    if (!isParallel && promises[actionName]) {
      return handleConflictingAction(
        promisesRef.current,
        conflictActionsRef.current,
        options.logEnabled,
        actionName,
        conflictPolicy,
        args
      );
    }

    const { promise, retryCount, retryDelaySeed } = asyncAction;

    let p = retryDecorator(promise, retryCount ? 1 + retryCount : 1, retryDelaySeed, isTriggerRetryError)(
      args,
      stateRef.current,
      propsRef.current,
      actionsRef.current
    );

    if (p === null) {
      logSingle(name, args, options.logEnabled, 'ABORTED');
      // this.markActionAsLoaded(name, conflictPolicy, promiseId);

      return null; // nothing to do
    }

    let promiseId = null;
    if (isParallel) {
      if (!action.getPromiseId) {
        throw new Error(
          'If conflict policy is set to ConflictPolicy.PARALLEL, getPromiseId must be set and returns a string.'
        );
      }
      promiseId = action.getPromiseId(...args);
    }

    dispatch({
      actionName,
      args,
      promiseId,
      props: propsRef.current,
      type: ReducerActionType.ACTION,
      subType: ReducerActionSubType.BEFORE_PROMISE,
    });

    p = p
      .then((result: PromiseResult<ReturnType<F>>) => {
        if (action.onDone) {
          // delayed job after state update
          addSideEffect(sideEffectsRef, (s: S) => {
            logSingle(actionName, args, options.logEnabled, 'onDone SIDE EFFECT');
            action.onDone(s, result, args as any, propsRef.current, actionsRef.current);
          });
        }
        dispatch({
          actionName,
          args,
          result,
          promiseId,
          props: propsRef.current,
          type: ReducerActionType.ACTION,
          subType: ReducerActionSubType.SUCCESS,
        });

        delete promisesRef.current[actionName];

        processNextConflictAction(actionName, actionsRef.current, conflictActionsRef.current);

        return result;
      })
      .catch((error: any) => {
        dispatch({
          actionName,
          args,
          error,
          promiseId,
          props: propsRef.current,
          type: ReducerActionType.ACTION,
          subType: ReducerActionSubType.ERROR,
        });

        const notifyError = options.notifyError || propsRef.current['notifyError'];

        let errorHandled = false;

        if (notifyError && (action.errorMessage || action.getErrorMessage)) {
          let msg: string;

          errorHandled = true;

          if (action.getErrorMessage) {
            msg = action.getErrorMessage(error, args, propsRef.current);
          }

          if (!msg) {
            msg = action.errorMessage;
          }

          if (msg) {
            notifyError(msg);
          }
        }

        const result = !errorHandled || action.rejectPromiseOnError ? Promise.reject(error) : undefined;

        delete promisesRef.current[actionName];

        processNextConflictAction(name, actionsRef.current, conflictActionsRef.current);

        return result;
      });

    promises[actionName] = {
      promise: p,
      refArgs: conflictPolicy === ConflictPolicy.REUSE && args.length > 0 ? [...args] : [],
    };

    return p;
  };
}

export function createNewHookState<S, A>(
  oldHookState: HookState<S, A>,
  actionName: string,
  conflictPolicy: ConflictPolicy,
  promiseId: string,
  newState: S,
  actionLoading: boolean
): HookState<S, A> {
  if (conflictPolicy === ConflictPolicy.PARALLEL) {
    if (actionLoading) {
      return {
        ...oldHookState,
        state: newState || oldHookState.state,
        loadingMap: { ...oldHookState.loadingMap, [actionName]: true } as LoadingMap<A>,
        loadingParallelMap: {
          ...oldHookState.loadingParallelMap,
          [actionName]: {
            ...oldHookState.loadingParallelMap[actionName],
            [promiseId]: true,
          },
        },
      };
    }

    const map = {
      ...oldHookState.loadingParallelMap,
      [actionName]: {
        ...oldHookState.loadingParallelMap[actionName],
      },
    };

    delete map[actionName][promiseId];
    const len = Object.keys(map[actionName]).length;

    return {
      ...oldHookState,
      loadingMap: {
        ...oldHookState.loadingMap,
        [actionName]: len > 0,
      },
      loadingParallelMap: map,
    };
  }
  return {
    ...oldHookState,
    state: newState || oldHookState.state,
    loadingMap: { ...oldHookState.loadingMap, [actionName]: actionLoading } as LoadingMap<A>,
  };
}

/**
 * Returns the reducer to be executed by the internal useReducer.
 * actions & options are captured: this function is still pure.
 */
export function getUseReducer<S, A extends DecoratedActions, P>(
  actions: StateDecoratorActions<S, A, P>,
  options: StateDecoratorOptions<S, A>
) {
  return (hookState: HookState<S, A>, reducerAction: ReducerAction<any, P>): HookState<S, A> => {
    const { type, actionName, subType: actionType, promiseId, args, props, result, error } = reducerAction;

    const state = hookState.state;

    if (type === ReducerActionType.ON_PROP_CHANGE_REDUCER) {
      const newState = options.onPropsChangeReducer(state, props);
      if (newState !== null) {
        logStateChange('onPropsChangeReducer', options.logEnabled, state, newState, [], '');
        return { ...hookState, state: newState };
      }
      return hookState;
    }

    const action = actions[actionName];

    if (isSyncAction(action)) {
      const newState = action(state, args as any, props);
      logStateChange(actionName as string, options.logEnabled, state, newState, args, null);
      return newState === null ? hookState : { ...hookState, state: newState };
    }

    if (isAdvancedSyncAction(action)) {
      const newState = action.action(state, args as any, props);
      logStateChange(actionName as string, options.logEnabled, state, newState, args, null);

      let newHookState: HookState<S, A> = hookState;
      if (action.onActionDone || newState) {
        newHookState = {
          ...hookState,
          state: newState || hookState.state,
          sideEffectRender: action.onActionDone ? 1 - hookState.sideEffectRender : hookState.sideEffectRender,
        };
      }
      return newHookState;
    }

    if (isAsyncAction(action)) {
      let newState = null;

      switch (actionType) {
        case ReducerActionSubType.BEFORE_PROMISE: {
          if (action.preReducer) {
            newState = action.preReducer(state, args as any, props);
            logStateChange(actionName as string, options.logEnabled, state, newState, args, 'preReducer');
          }

          return createNewHookState(hookState, actionName, action.conflictPolicy, promiseId, newState, true);
        }
        case ReducerActionSubType.SUCCESS: {
          if (action.reducer) {
            newState = action.reducer(state, result, args as any, props);
            logStateChange(actionName as string, options.logEnabled, state, newState, args, 'reducer');
          }

          const newHookState = createNewHookState(
            hookState,
            actionName,
            action.conflictPolicy,
            promiseId,
            newState,
            false
          );

          if (action.onDone) {
            newHookState.sideEffectRender = 1 - hookState.sideEffectRender;
          }

          return newHookState;
        }
        case ReducerActionSubType.ERROR: {
          if (action.errorReducer) {
            newState = action.errorReducer(state, error, args as any, props);
            logStateChange(actionName as string, options.logEnabled, state, newState, args, 'errorReducer');
          }

          return createNewHookState(hookState, actionName, action.conflictPolicy, promiseId, newState, false);
        }

        default:
          const s: never = actionType;
          s;
      }
    }

    return hookState;
  };
}

export function getInitialHookState<S, A extends DecoratedActions, P>(
  stateInitializer: (props?: P) => S,
  actions: StateDecoratorActions<S, A, P>,
  props: P
): HookState<S, A> {
  const names = Object.keys(actions);
  return {
    sideEffectRender: 0,
    state: stateInitializer(props),
    loadingMap: toMap(names, (n) => n, () => undefined) as LoadingMap<A>,
    loadingParallelMap: toMap(names, (n) => n, () => undefined) as LoadingMapParallelActions<A>,
  };
}

function isLoading<A>(loadingMap: LoadingMap<A>) {
  return Object.keys(loadingMap).find((name) => loadingMap[name] === true) != null;
}

/**
 * Manages onPropsChangeRenducer dispatch and onPropsChange side effects.
 */
export function handlePropChange<S, A, P>(
  dispatch: React.Dispatch<ReducerAction<any, P>>,
  isMounted: boolean,
  props: P,
  options: StateDecoratorOptions<S, A>,
  sideEffectsRef: React.MutableRefObject<SideEffect<S>[]>,
  actionsRef: React.MutableRefObject<A>
) {
  if (isMounted) {
    const { onPropsChangeReducer, onPropsChange } = options;

    if (onPropsChangeReducer) {
      dispatch({ props, type: ReducerActionType.ON_PROP_CHANGE_REDUCER, args: [] });
    }
    if (onPropsChange) {
      addNewSideEffect(sideEffectsRef, (s: S) => {
        logSingle('onPropsChange', [], options.logEnabled);
        onPropsChange(s, props, actionsRef.current);
      });
    }
  }
}

/**
 * Registers a new side effect.
 * A side effect is a function that takes the current state and execute some side effects that doesn't change the state directly.
 */
function processSideEffects<S>(state: S, sideEffectRef: React.MutableRefObject<SideEffect<S>[]>) {
  if (sideEffectRef.current.length > 0) {
    sideEffectRef.current.forEach((job) => {
      job(state);
    });
    sideEffectRef.current = [];
  }
}

/**
 * The state decorator hook.
 */
export default function useStateDecorator<S, A extends DecoratedActions, P = {}>(
  stateInitializer: (props?: P) => S,
  actions: StateDecoratorActions<S, A, P>,
  props: P = {} as P,
  options: StateDecoratorOptions<S, A> = {}
) {
  const stateRef = useRef<S>();
  const propsRef = useRef<P>();
  const actionsRef = useRef<A>();
  const sideEffectsRef = useRef<SideEffect<S>[]>([]);
  const mountedRef = useRef(false);
  const debounceActionMapRef = useRef<DebounceMap>({});
  const promisesRef = useRef<PromiseMap>({});
  const conflictActionsRef = useRef<ConflictActionsMap>({});

  propsRef.current = props;

  const reducer = useMemo(() => getUseReducer(actions, options), []);

  const [hookState, dispatch] = useReducer(reducer, getInitialHookState(stateInitializer, actions, props));
  stateRef.current = hookState.state;

  const decoratedActions = useMemo(() => {
    const res = Object.keys(actions).reduce((acc, actionName) => {
      const action = actions[actionName];

      if (isSyncAction(action)) {
        acc[actionName] = decorateSyncAction(dispatch, actionName, action, propsRef);
      } else if (isAdvancedSyncAction(action)) {
        acc[actionName] = decorateAdvancedSyncAction(
          dispatch,
          actionName,
          action,
          propsRef,
          actionsRef,
          sideEffectsRef,
          options,
          addNewSideEffect,
          debounceActionMapRef
        );
      } else if (isAsyncAction(action)) {
        acc[actionName] = decorateAsyncAction(
          dispatch,
          actionName,
          computeAsyncActionInput(action),
          stateRef,
          propsRef,
          actionsRef,
          sideEffectsRef,
          promisesRef,
          conflictActionsRef,
          options,
          addNewSideEffect
        );
      } // else no-op

      return acc;
    }, {}) as A;

    return res;
  }, []); // decorated actions are not refreshed

  actionsRef.current = decoratedActions;

  processSideEffects(hookState.state, sideEffectsRef);

  const { getPropsRefValues = () => [] } = options;

  useEffect(() => {
    handlePropChange(dispatch, mountedRef.current, props, options, sideEffectsRef, actionsRef);
  }, getPropsRefValues(props));

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const loading = isLoading(hookState.loadingMap);
  return { loading, state: hookState.state, actions: decoratedActions, loadingMap: hookState.loadingMap };
}
