/*
 * Copyright 2019 Globalsport SAS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React, { useReducer, useRef, useEffect } from 'react';

import {
  DecoratedActions,
  StateDecoratorActions,
  LoadingMap,
  LoadingMapParallelActions,
  PromiseResult,
  AdvancedSynchAction,
  ConflictPolicy,
  ConflictActionsMap,
  AsynchActionPromise,
  ActionHistory,
  OptimisticActionsMap,
  ReducerName,
  AsynchAction,
  StateDecoratorAction,
  GlobalAsyncHook,
  CloneFunction,
  NotifyFunc,
  TriggerReryError,
} from './types';

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
  defaultCloneFunc,
} from './base';
import { useOnMount } from './hooks';

let cloneFunc: CloneFunction = defaultCloneFunc;

function clone(obj: any) {
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

/**
 * Sets the clone function. Used to clone state and props when managing optimistic reducer and conflicting actions.
 * Default implementation is a very basic algorithm using JSON.stringify. To clone complex stats,
 * use a custom implementation like lodash/cloneDeep.
 */
export function setCloneFunction(cloneFn: CloneFunction) {
  cloneFunc = cloneFn;
}

let onAsyncError: GlobalAsyncHook = (f: GlobalAsyncHook) => {};

/**
 * Sets a global callback function to handle asynchronous promise rejection errors.
 */
export function setOnAsyncError(f: GlobalAsyncHook) {
  onAsyncError = f;
}

let isTriggerRetryError: TriggerReryError = (error: Error) => error instanceof TypeError;

/**
 * Sets a function that tests if the error will trigger a retry of the action or will fail directly.
 * Default implementation is returning true for TypeError instances only.
 * @see AsynchActionBase#retryCount
 */
export function setIsTriggerRetryError(f: TriggerReryError) {
  isTriggerRetryError = f;
}

let globalNotifyError = null;
let globalNotifySuccess = null;

/**
 * Sets a global notification function that will called when an asynchronous action fails,
 * if and only if, an error message is specified for this action using <code>errorMessage</code> or
 * <code>getErrorMessage</code>.
 * If another function is set in the useStateDecorator options, the function from the options will be used.
 * It allows to locally use another notification function.
 */
export function setNotifyErrorFunction(notifyErrorIn: NotifyFunc) {
  globalNotifyError = notifyErrorIn;
}

/**
 * Sets a global notification function that will called when an asynchronous action succeeded,
 * if and only if, an success message is specified for this action using <code>successMessage</code> or
 * <code>getSuccessMessage</code>.
 * If another function is set in the useStateDecorator options, the function from the options will be used.
 * It allows to locally use another notification function.
 */
export function setNotifySuccessFunction(notifySuccessIn: NotifyFunc) {
  globalNotifySuccess = notifySuccessIn;
}

type HookState<S, A> = {
  state: S;
  sideEffectRender: number;
  loadingMap: LoadingMap<A>;
  loadingParallelMap: LoadingMapParallelActions<A>;
  optimisticData: OptimisticData<S>;
};

type SideEffect<S, A extends DecoratedActions, P> = (
  s: S,
  dispatch?: React.Dispatch<ReducerAction<S, any, A, P>>
) => void;

type SideEffects<S, A extends DecoratedActions, P> = SideEffect<S, A, P>[];

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

export type ReducerAction<S, F extends (...args: any[]) => any, A extends DecoratedActions, P> = {
  type: ReducerActionType;
  args: Parameters<F>;
  result?: any;
  promiseId?: string;
  error?: any;
  props: P;
  actionName?: string;
  subType?: ReducerActionSubType;
  rawActionsRef?: React.MutableRefObject<StateDecoratorActions<S, A, P>>;
};

type OptimisticData<S> = {
  history: ActionHistory<S>[];
  optimisticActions: OptimisticActionsMap;
  shouldRecordHistory: boolean;
};

type OnPropsChangeReducer<S, P> = (s: S, newProps: P, updatedIndices: number[]) => S;

type PromiseMap = { [name: string]: { promise: Promise<any>; refArgs: any[] } };

export type StateDecoratorOptions<S, A, P = {}> = {
  /**
   * The state decorator name. Use in debug traces to identify the useStateDecorator instance.
   */
  name?: string;

  /**
   * Show logs in the console in development mode.
   */
  logEnabled?: boolean;

  /**
   * List of action names that are marked as loading at initial time.
   * As a render is done before first actions can be trigerred, some actions can be marked as loading at
   * initial time.
   */
  initialActionsMarkedLoading?: string[];

  /**
   * Get a list of values that will be use as reference values.
   * If they are different (shallow compare), onPropsChangeReducer then onPropsChange will be called.
   */
  getPropsRefValues?: (props: P) => any[];

  /**
   * Triggered when values of reference from props have changed. Allow to call actions after a prop change.
   */
  onPropsChange?: (s: S, newProps: any, actions: A, updatedIndices: number[]) => void;

  /**
   * Triggered when values of reference from props have changed. Allow to update state after a prop change.
   * <b>null</b> means no change.
   */
  onPropsChangeReducer?: OnPropsChangeReducer<S, P>;

  /**
   * The callback function called if an asynchronous function succeeded and a success messsage is defined.
   */
  notifySuccess?: (message: string) => void;

  /**
   * The callback function called if an asynchronous function fails and an error messsage is defined.
   */
  notifyError?: (message: string) => void;

  /**
   * Initial actions
   */
  onMount?: (actions: A, props: P) => void;
};

/**
 * Returns a function that decorates the synchronous action.
 * It will dispatch actions for the useReducer.
 */
export function decorateSyncAction<S, F extends (...args: any[]) => any, A extends DecoratedActions, P>(
  dispatch: React.Dispatch<ReducerAction<S, F, A, P>>,
  actionName: string,
  propsRef: React.MutableRefObject<P>
) {
  return (...args: Parameters<F>) => {
    dispatch({ actionName, args, props: propsRef.current, type: ReducerActionType.ACTION });
  };
}

/**
 * Stores in the side effect ref a new array that contains the new side effect.
 */
export function addNewSideEffect<S, A extends DecoratedActions, P>(
  sideEffectsRef: React.MutableRefObject<SideEffects<S, A, P>>,
  newSideEffect: SideEffect<S, A, P>
) {
  sideEffectsRef.current.push(newSideEffect);
}

function processAdvancedSyncAction<S, F extends (...args: any[]) => any, A extends DecoratedActions, P>(
  dispatch: React.Dispatch<ReducerAction<S, F, A, P>>,
  actionName: string,
  action: AdvancedSynchAction<S, F, A, P>,
  args: Parameters<F>,
  propsRef: React.MutableRefObject<P>,
  actionsRef: React.MutableRefObject<A>,
  sideEffectsRef: React.MutableRefObject<SideEffects<S, A, P>>,
  options: StateDecoratorOptions<S, A, P>,
  addSideEffect: typeof addNewSideEffect
) {
  dispatch({ actionName, args, props: propsRef.current, type: ReducerActionType.ACTION });
  if (action.onActionDone) {
    addSideEffect(sideEffectsRef, (s: S) => {
      logSingle(options.name, actionName, args, options.logEnabled, 'onActionDone SIDE EFFECT');
      action.onActionDone(s, args as any, propsRef.current, actionsRef.current);
    });
  }
}

/**
 * Returns a function that decorates the synchronous action.
 * It will dispatch actions for the useReducer.
 */
export function decorateAdvancedSyncAction<S, F extends (...args: any[]) => any, A extends DecoratedActions, P>(
  dispatch: React.Dispatch<ReducerAction<S, F, A, P>>,
  actionName: string,
  action: AdvancedSynchAction<S, F, A, P>,
  propsRef: React.MutableRefObject<P>,
  actionsRef: React.MutableRefObject<A>,
  sideEffectsRef: React.MutableRefObject<SideEffects<S, A, P>>,
  options: StateDecoratorOptions<S, A, P>,
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

/**
 * Handles a conflicting action depending on the action conflict policy.
 */
function handleConflictingAction(
  sdName: string,
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
        logSingle(sdName, actionName, args, logEnabled, 'Drop request (Conflict policy is IGNORE)');
        resolve();
        break;
      case ConflictPolicy.REJECT:
        logSingle(sdName, actionName, args, logEnabled, 'Reject request (Conflict policy is REJECT)');
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

/**
 * Processes next conflicting action (see ConflictPolicy) in the queue.
 */
function processNextConflictAction<A>(actionName: string, actions: A, conflictActions: ConflictActionsMap) {
  const futureActions = conflictActions[actionName];

  if (futureActions && futureActions.length > 0) {
    const futureAction = conflictActions[actionName].shift();

    if (futureAction) {
      const p = actions[actionName](...futureAction.args) as Promise<any>;
      if (p == null) {
        processNextConflictAction(actionName, actions, conflictActions);
      } else {
        p.then((res) => {
          if (res === null) {
            // promise was aborted
            processNextConflictAction(actionName, actions, conflictActions);
          }
          futureAction.resolve(res);
        }).catch((e) => futureAction.reject(e));
      } // else aborted
    }
  }
}

/**
 * Adds an action to the action history (only when at least one optimistic action is ongoing).
 * @param actionName The action name
 * @param reducer The reducer name
 * @param args The arguments of the action (will be cloned)
 * @param beforeState state before the optimistic action
 */
function pushActionToHistory<S>(
  optimisticData: OptimisticData<S>,
  actionName: string,
  reducer: ReducerName,
  args: any[],
  beforeState = null
): OptimisticData<S> {
  const { shouldRecordHistory } = optimisticData;
  let { history } = optimisticData;

  if (shouldRecordHistory) {
    if (history === null) {
      history = [];
    }
    const newEntry = {
      reducer,
      actionName,
      beforeState: beforeState ? clone(beforeState) : null,
      args: args.map((item) => clone(item)),
    };
    return {
      ...optimisticData,
      history: [...history, newEntry],
    };
  }
  return optimisticData;
}

/**
 * Undo the optimistic action.
 * Strategy:
 *  - Get the state before the optimistic reducer
 *  - Replay all actions that occured after the optimistic action.
 * @param actionName The action name.
 */
function undoOptimisticAction<S, A extends DecoratedActions, P>(
  optimisticData: OptimisticData<S>,
  actionName: string,
  onPropChangeReducer: OnPropsChangeReducer<S, P>,
  rawActions: StateDecoratorActions<S, A, P>
) {
  const { optimisticActions, history } = optimisticData;

  if (!optimisticActions[actionName]) {
    return null;
  }

  // find the optimistic action in the history
  const index = history.findIndex((a) => a.actionName === actionName);

  // find the state at the time of the optimistic action.
  let state = history[index].beforeState;

  // remove it as this optimistic action fails
  history.splice(index, 1);

  for (let i = index; i < history.length; i++) {
    const action = history[i];

    // This is an optimistic action, update restore state
    if (action.beforeState) {
      action.beforeState = state;
    }

    const rawAction = rawActions[action.actionName];
    if (action.reducer === 'onPropChangeReducer') {
      state = (onPropChangeReducer as any)(state, ...action.args);
    } else if (isAsyncAction(rawAction)) {
      state = (rawAction as any)[action.reducer](state, ...action.args);
    } else if (isAdvancedSyncAction(rawAction)) {
      state = (rawAction as any).action(state, ...action.args);
    } else {
      state = (rawAction as any)(state, ...action.args);
    }
  }

  // clean up
  const newOptimisticData = cleanHistoryAfterOptimistAction(optimisticData, actionName, index);

  return { state, optimisticData: newOptimisticData };
}

export function cleanHistoryAfterOptimistAction<S>(
  optimisticData: OptimisticData<S>,
  name: string,
  indexInHistory: number = undefined
) {
  const { optimisticActions, history } = optimisticData;

  if (!optimisticActions[name]) {
    return null;
  }

  delete optimisticActions[name];

  const optiStateKeys = Object.keys(optimisticActions);

  if (optiStateKeys.length === 0) {
    optimisticData.history = [];
    optimisticData.shouldRecordHistory = false;
  } else {
    const index = indexInHistory === undefined ? history.findIndex((a) => a.actionName === name) : indexInHistory;

    if (index === 0) {
      // this was the first optimist action, so find the next one
      const nextOptimisticIndex = history.slice(1).findIndex((a) => a.beforeState != null) + 1;

      // forget actions before the first optimist action in the history
      history.splice(0, nextOptimisticIndex);
    } else if (indexInHistory === undefined) {
      // success use case.
      // this was not the first optimist action, but can forget the saved state.
      // it becomes an asynchronous action.
      history[index].beforeState = null;
    }
  }
  return optimisticData;
}

export function sendRequest<S, F extends (...args: any[]) => any, A extends DecoratedActions, P>(
  dispatch: React.Dispatch<ReducerAction<S, F, A, P>>,
  state: S,
  actionName: string,
  asyncAction: AsynchActionPromise<S, F, A, P>,
  args: Parameters<F>,
  promiseId: string,
  propsRef: React.MutableRefObject<P>,
  unmountedRef: React.MutableRefObject<boolean>,
  actionsRef: React.MutableRefObject<A>,
  rawActionsRef: React.MutableRefObject<StateDecoratorActions<S, A, P>>,
  sideEffectsRef: React.MutableRefObject<SideEffects<S, A, P>>,
  promisesRef: React.MutableRefObject<PromiseMap>,
  conflictActionsRef: React.MutableRefObject<ConflictActionsMap>,
  options: StateDecoratorOptions<S, A, P>,
  addSideEffect: typeof addNewSideEffect
) {
  const { current: promises } = promisesRef;
  const { promise, retryCount, retryDelaySeed } = asyncAction;

  let p = retryDecorator(promise, retryCount ? 1 + retryCount : 1, retryDelaySeed, isTriggerRetryError)(
    args,
    state,
    propsRef.current,
    actionsRef.current
  );

  if (p === null) {
    // remove current promise that was pending in decorated action.
    delete promises[actionName];

    logSingle(options.name, actionName, args, options.logEnabled, 'ABORTED');

    return null; // nothing to do
  }

  p = p
    .then((result: PromiseResult<ReturnType<F>>) => {
      if (unmountedRef.current) {
        return null;
      }

      if (asyncAction.onDone) {
        // delayed job after state update
        addSideEffect(sideEffectsRef, (s: S) => {
          logSingle(options.name, actionName, args, options.logEnabled, 'onDone SIDE EFFECT');
          asyncAction.onDone(s, result, args as any, propsRef.current, actionsRef.current);
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

      const notifySuccess = options.notifySuccess || propsRef.current['notifySuccess'] || globalNotifySuccess;

      if (notifySuccess) {
        let msg: string;

        if (asyncAction.getSuccessMessage) {
          msg = asyncAction.getSuccessMessage(result, args, propsRef.current);
        }

        if (!msg) {
          msg = asyncAction.successMessage;
        }

        if (msg) {
          notifySuccess(msg);
        }
      }

      processNextConflictAction(actionName, actionsRef.current, conflictActionsRef.current);

      return result;
    })
    .catch((error: any) => {
      if (unmountedRef.current) {
        return null;
      }

      dispatch({
        actionName,
        args,
        error,
        promiseId,
        rawActionsRef,
        props: propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.ERROR,
      });

      const notifyError = options.notifyError || propsRef.current['notifyError'] || globalNotifyError;

      let errorHandled = false;

      if (notifyError && (asyncAction.errorMessage || asyncAction.getErrorMessage)) {
        let msg: string;

        errorHandled = true;

        if (asyncAction.getErrorMessage) {
          msg = asyncAction.getErrorMessage(error, args, propsRef.current);
        }

        if (!msg) {
          msg = asyncAction.errorMessage;
        }

        if (msg) {
          notifyError(msg);
        }
      }

      onAsyncError(error, errorHandled);

      const result = !errorHandled || asyncAction.rejectPromiseOnError ? Promise.reject(error) : undefined;

      delete promises[actionName];

      processNextConflictAction(name, actionsRef.current, conflictActionsRef.current);

      return result;
    });
  return p;
}

/**
 * Returns a function that decorates the asynchronous action.
 * It will dispatch actions for the useReducer.
 */
export function decorateAsyncAction<S, F extends (...args: any[]) => any, A extends DecoratedActions, P>(
  dispatch: React.Dispatch<ReducerAction<S, F, A, P>>,
  actionName: string,
  stateRef: React.MutableRefObject<S>,
  propsRef: React.MutableRefObject<P>,
  unmountedRef: React.MutableRefObject<boolean>,
  actionsRef: React.MutableRefObject<A>,
  rawActionsRef: React.MutableRefObject<StateDecoratorActions<S, A, P>>,
  sideEffectsRef: React.MutableRefObject<SideEffects<S, A, P>>,
  promisesRef: React.MutableRefObject<PromiseMap>,
  conflictActionsRef: React.MutableRefObject<ConflictActionsMap>,
  options: StateDecoratorOptions<S, A, P>,
  addSideEffect: typeof addNewSideEffect
) {
  return (...args: Parameters<F>): Promise<any> => {
    const action: StateDecoratorAction<S, any, A, P> = rawActionsRef.current[actionName];
    let asyncAction: AsynchActionPromise<S, any, A, P>;

    if (isAsyncAction(action)) {
      asyncAction = computeAsyncActionInput(action);
    } else {
      return null;
    }

    const { conflictPolicy = ConflictPolicy.KEEP_ALL } = asyncAction;
    const { current: promises } = promisesRef;
    const isParallel = conflictPolicy === ConflictPolicy.PARALLEL;

    if (!isParallel && promises[actionName]) {
      return handleConflictingAction(
        options.name,
        promisesRef.current,
        conflictActionsRef.current,
        options.logEnabled,
        actionName,
        conflictPolicy,
        args
      );
    }

    let promiseId = null;
    if (isParallel) {
      if (!asyncAction.getPromiseId) {
        throw new Error(
          'If conflict policy is set to ConflictPolicy.PARALLEL, getPromiseId must be set and returns a string.'
        );
      }
      promiseId = asyncAction.getPromiseId(...args);
    }

    const p = new Promise((res, rej) => {
      addSideEffect(sideEffectsRef, (s, d) => {
        // send request when before promise action is done

        const p = sendRequest(
          d,
          s,
          actionName,
          asyncAction,
          args,
          promiseId,
          propsRef,
          unmountedRef,
          actionsRef,
          rawActionsRef,
          sideEffectsRef,
          promisesRef,
          conflictActionsRef,
          options,
          addSideEffect
        );

        if (p === null) {
          // promise is aborted
          res(null);
        } else {
          p.then(res).catch(rej);
        }
      });
    });

    promises[actionName] = {
      promise: p,
      refArgs: conflictPolicy === ConflictPolicy.REUSE && args.length > 0 ? [...args] : [],
    };

    dispatch({
      actionName,
      args,
      promiseId,
      props: propsRef.current,
      type: ReducerActionType.ACTION,
      subType: ReducerActionSubType.BEFORE_PROMISE,
    });

    return p;
  };
}

function cloneOptimisticData<S>(optimisticData: OptimisticData<S>) {
  return {
    ...optimisticData,
    history: clone(optimisticData.history),
    optimisticActions: { ...optimisticData.optimisticActions },
  };
}

export function createNewHookState<S, A>(
  oldHookState: HookState<S, A>,
  actionName: string,
  conflictPolicy: ConflictPolicy,
  promiseId: string,
  newState: S,
  actionLoading: boolean,
  newOptimisticData: OptimisticData<S>
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
        optimisticData: newOptimisticData || oldHookState.optimisticData,
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
      optimisticData: newOptimisticData || oldHookState.optimisticData,
    };
  }
  return {
    ...oldHookState,
    state: newState || oldHookState.state,
    loadingMap: { ...oldHookState.loadingMap, [actionName]: actionLoading } as LoadingMap<A>,
    optimisticData: newOptimisticData || oldHookState.optimisticData,
  };
}

/**
 * Handle an asynchronous action dispatched in the internal useReducer reducer function.
 */
function processAsyncReducer<S, A extends DecoratedActions, P>(
  hookState: HookState<S, A>,
  reducerAction: ReducerAction<S, any, A, P>,
  action: AsynchAction<S, any, A, P>,
  options: StateDecoratorOptions<S, A, P>
): HookState<S, A> {
  const { actionName, subType: actionType, promiseId, args, props, result, error } = reducerAction;
  const { optimisticData } = hookState;

  const state = hookState.state;

  let newState = null;
  let newOptimisticData: OptimisticData<S> = null;

  switch (actionType) {
    case ReducerActionSubType.BEFORE_PROMISE: {
      if (action.preReducer) {
        newState = action.preReducer(state, args as any, props);
        newOptimisticData = pushActionToHistory(optimisticData, actionName, 'preReducer', args);
        logStateChange(options.name, actionName, options.logEnabled, state, newState, args, 'preReducer');
      }

      let loading = true;
      if (action.optimisticReducer) {
        newState = action.optimisticReducer(newState || state, args as any, props);

        newOptimisticData = newOptimisticData || cloneOptimisticData(optimisticData);
        newOptimisticData.optimisticActions = {
          ...newOptimisticData.optimisticActions,
          [actionName]: true,
        };
        newOptimisticData.shouldRecordHistory = true;
        newOptimisticData = pushActionToHistory(
          newOptimisticData,
          actionName,
          'optimisticReducer',
          [args, props],
          state
        );

        // mark action as not loading
        loading = false;
      }

      return createNewHookState(
        hookState,
        actionName,
        action.conflictPolicy,
        promiseId,
        newState,
        loading,
        newOptimisticData
      );
    }
    case ReducerActionSubType.SUCCESS: {
      if (action.reducer) {
        newState = action.reducer(state, result, args as any, props);
        newOptimisticData = pushActionToHistory(optimisticData, actionName, 'reducer', [result, args, props]);
        logStateChange(options.name, actionName, options.logEnabled, state, newState, args, 'reducer');
      }

      if (optimisticData.optimisticActions[actionName]) {
        // the action is successful, no need to keep the history of actions.
        newOptimisticData = cleanHistoryAfterOptimistAction(
          newOptimisticData || cloneOptimisticData(optimisticData),
          actionName
        );
      }

      const newHookState = createNewHookState(
        hookState,
        actionName,
        action.conflictPolicy,
        promiseId,
        newState,
        false,
        newOptimisticData
      );

      if (action.onDone) {
        newHookState.sideEffectRender = 1 - hookState.sideEffectRender;
      }

      return newHookState;
    }
    case ReducerActionSubType.ERROR: {
      if (optimisticData.optimisticActions[actionName]) {
        newOptimisticData = cloneOptimisticData(optimisticData);
        const res = undoOptimisticAction(
          optimisticData,
          actionName,
          options.onPropsChangeReducer,
          reducerAction.rawActionsRef.current
        );
        newOptimisticData = res.optimisticData;
        newState = res.state;
      }

      if (action.errorReducer) {
        newState = action.errorReducer(state, error, args as any, props);
        newOptimisticData = pushActionToHistory(newOptimisticData || optimisticData, actionName, 'errorReducer', [
          error,
          args,
          props,
        ]);

        logStateChange(options.name, actionName, options.logEnabled, state, newState, args, 'errorReducer');
      }

      return createNewHookState(
        hookState,
        actionName,
        action.conflictPolicy,
        promiseId,
        newState,
        false,
        newOptimisticData
      );
    }

    default:
      const s: never = actionType;
      s;
  }

  return hookState;
}

type GetUseReducerResult<S, A extends DecoratedActions, P> = (
  hookState: HookState<S, A>,
  reducerAction: ReducerAction<S, any, A, P>
) => HookState<S, A>;

/**
 * Returns the reducer to be executed by the internal useReducer.
 * actions & options are captured and static: this function is still pure.
 */
export function getUseReducer<S, A extends DecoratedActions, P>(
  actions: StateDecoratorActions<S, A, P>,
  options: StateDecoratorOptions<S, A, P>
): GetUseReducerResult<S, A, P> {
  return (hookState: HookState<S, A>, reducerAction: ReducerAction<S, any, A, P>): HookState<S, A> => {
    const { type, actionName, args, props } = reducerAction;
    const { state, optimisticData } = hookState;

    let newOptimisticData: OptimisticData<S> = optimisticData;

    if (type === ReducerActionType.ON_PROP_CHANGE_REDUCER) {
      const newState = options.onPropsChangeReducer(state, props, args as number[]);
      if (newState !== null) {
        logStateChange(options.name, 'onPropsChangeReducer', options.logEnabled, state, newState, [], '');
        const newOptimisticData = pushActionToHistory(hookState.optimisticData, actionName, 'onPropChangeReducer', [
          props,
        ]);
        return { ...hookState, state: newState, optimisticData: newOptimisticData };
      }
      return hookState;
    }

    const action = actions[actionName];

    if (isSyncAction(action)) {
      const newState = action(state, args as any, props);
      if (newState !== null) {
        newOptimisticData = pushActionToHistory(optimisticData, actionName, null, [args, props]);
      }
      logStateChange(options.name, actionName, options.logEnabled, state, newState, args, null);
      return newState === null ? hookState : { ...hookState, state: newState, optimisticData: newOptimisticData };
    }

    if (isAdvancedSyncAction(action)) {
      const newState = action.action(state, args as any, props);
      logStateChange(options.name, actionName, options.logEnabled, state, newState, args, null);

      if (newState !== null) {
        newOptimisticData = pushActionToHistory(optimisticData, actionName, null, [args, props]);
      }

      let newHookState: HookState<S, A> = hookState;
      if (action.onActionDone || newState) {
        newHookState = {
          ...hookState,
          state: newState || hookState.state,
          sideEffectRender: action.onActionDone ? 1 - hookState.sideEffectRender : hookState.sideEffectRender,
          optimisticData: newOptimisticData,
        };
      }
      return newHookState;
    }

    if (isAsyncAction(action)) {
      return processAsyncReducer(hookState, reducerAction, action, options);
    }

    return hookState;
  };
}

/**
 * Computes the initial state of the useStateDecorator hook.
 */
export function getInitialHookState<S, A extends DecoratedActions, P>(
  stateInitializer: (props?: P) => S,
  actions: StateDecoratorActions<S, A, P>,
  props: P,
  initialActionsMarkedLoading: string[] = []
): HookState<S, A> {
  const names = Object.keys(actions);
  const initialActions = toMap(
    initialActionsMarkedLoading,
    (i) => i,
    (_) => true
  );
  return {
    sideEffectRender: 0,
    state: stateInitializer(props),
    loadingMap: toMap(
      names,
      (n) => n,
      (n) => initialActions[n]
    ) as LoadingMap<A>,
    loadingParallelMap: toMap(
      names,
      (n) => n,
      () => ({})
    ) as LoadingMapParallelActions<A>,
    optimisticData: {
      history: [],
      optimisticActions: {},
      shouldRecordHistory: false,
    },
  };
}

function isLoading<A>(loadingMap: LoadingMap<A>) {
  return Object.keys(loadingMap).find((name) => loadingMap[name] === true) != null;
}

/**
 * Manages onPropsChangeRenducer dispatch and onPropsChange side effects.
 */
export function handlePropChange<S, A extends DecoratedActions, P>(
  dispatch: React.Dispatch<ReducerAction<S, any, A, P>>,
  props: P,
  options: StateDecoratorOptions<S, A, P>,
  oldPropsRef: React.MutableRefObject<P>,
  sideEffectsRef: React.MutableRefObject<SideEffects<S, A, P>>,
  actionsRef: React.MutableRefObject<A>
) {
  const { changed, indices } = isPropsChanged(oldPropsRef.current, props, options.getPropsRefValues);

  if (changed) {
    const { onPropsChangeReducer, onPropsChange } = options;

    if (onPropsChangeReducer) {
      dispatch({ props, type: ReducerActionType.ON_PROP_CHANGE_REDUCER, args: indices });
    }
    if (onPropsChange) {
      addNewSideEffect(sideEffectsRef, (s: S) => {
        logSingle(options.name, 'onPropsChange', [], options.logEnabled);
        onPropsChange(s, props, actionsRef.current, indices);
      });
    }
  }
}

/**
 * Registers a new side effect.
 * A side effect is a function that takes the current state and execute some side effects that doesn't change the state directly.
 * ex: onDone, onActionDone,onPropChange, sendRequest are side effects
 */
export function processSideEffects<S, A extends DecoratedActions, P>(
  state: S,
  dispatch: React.Dispatch<ReducerAction<S, any, A, P>>,
  sideEffectRef: React.MutableRefObject<SideEffects<S, A, P>>
) {
  if (sideEffectRef.current.length > 0) {
    const jobs = sideEffectRef.current.concat();
    // jobs will add new side effects to be processed in the future
    sideEffectRef.current = [];
    try {
      jobs.forEach((job) => job(state, dispatch));
    } catch (e) {
      console.error(e);
    }
  }
}

function isPropsChanged<P>(
  oldProps: P,
  newProps: P,
  getPropsRefValues: StateDecoratorOptions<any, any, P>['getPropsRefValues']
): {
  changed: boolean;
  indices: number[];
} {
  if (oldProps == null || getPropsRefValues == null) {
    return {
      changed: false,
      indices: null,
    };
  }

  const oldValues = getPropsRefValues(oldProps);
  const newValues = getPropsRefValues(newProps);

  if (oldValues.length !== newValues.length) {
    return {
      changed: true,
      indices: [],
    };
  }

  return oldValues.reduce(
    (res, oldValue, index) => {
      const newValue = newValues[index];
      if (oldValue !== newValue) {
        res.changed = true;
        res.indices.push(index);
      }
      return res;
    },
    { changed: false, indices: [] }
  );
}

/**
 * The state decorator hook.
 * @param stateInitializer A function that creates the initial state from the props.
 * @param actions The actions implementation.
 * @param props The inbound props.
 * @param options The options for advanced configuration.
 * @returns An object containing: state, actions, loading, loadingMap, loadingParallelMap properties.
 */
export default function useStateDecorator<S, A extends DecoratedActions, P = {}>(
  stateInitializer: (props: P) => S,
  actions: StateDecoratorActions<S, A, P>,
  props: P = {} as P,
  options: StateDecoratorOptions<S, A, P> = {}
) {
  const stateRef = useRef<S>();
  const propsRef = useRef<P>();
  const actionsRef = useRef<A>();
  const reducerRef = useRef<GetUseReducerResult<S, A, P>>();
  const rawActionsRef = useRef<StateDecoratorActions<S, A, P>>();
  const sideEffectsRef = useRef<SideEffects<S, A, P>>([]);
  const debounceActionMapRef = useRef<DebounceMap>({});
  const promisesRef = useRef<PromiseMap>({});
  const conflictActionsRef = useRef<ConflictActionsMap>({});
  const oldPropsRef = useRef<P>(null);
  const unmountedRef = useRef(false);

  rawActionsRef.current = actions;
  propsRef.current = props;

  if (reducerRef.current == null) {
    reducerRef.current = getUseReducer(actions, options);
  }

  const [hookState, dispatch] = useReducer(
    reducerRef.current,
    stateRef.current == null
      ? getInitialHookState(stateInitializer, actions, props, options.initialActionsMarkedLoading)
      : null
  );
  stateRef.current = hookState.state;

  if (actionsRef.current == null) {
    actionsRef.current = Object.keys(actions).reduce((acc, actionName) => {
      const action = actions[actionName];

      if (isSyncAction(action)) {
        acc[actionName] = decorateSyncAction(dispatch, actionName, propsRef);
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
          stateRef,
          propsRef,
          unmountedRef,
          actionsRef,
          rawActionsRef,
          sideEffectsRef,
          promisesRef,
          conflictActionsRef,
          options,
          addNewSideEffect
        );
      } // else no-op

      return acc;
    }, {}) as A;
  }

  const decoratedActions = actionsRef.current;

  if (!unmountedRef.current) {
    handlePropChange(dispatch, props, options, oldPropsRef, sideEffectsRef, actionsRef);

    // onDone, onActionDone,onPropChange, sendRequest are side effects
    processSideEffects(hookState.state, dispatch, sideEffectsRef);

    oldPropsRef.current = props;
  }

  // initial actions
  useOnMount(() => {
    options?.onMount?.(decoratedActions, props);
  });

  useEffect(() => {
    return () => {
      sideEffectsRef.current = [];
      unmountedRef.current = true;
    };
  }, []);

  return {
    loading: isLoading(hookState.loadingMap),
    state: hookState.state,
    actions: decoratedActions,
    loadingMap: hookState.loadingMap,
    loadingParallelMap: hookState.loadingParallelMap,
  };
}

export { LoadingMap, LoadingMapParallelActions };
