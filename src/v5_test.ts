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

import type { StoreAction } from './types';

import { setGlobalConfig, ConflictPolicy } from './index';

import {
  AdvancedSynchAction,
  AsynchActionPromiseGet,
  StateDecoratorAction,
  StateDecoratorActions,
  StateDecoratorOptions,
  AsynchActionPromise,
  SynchAction,
  LoadingMap,
  LoadingProps,
  LoadingMapParallelActions,
  AsynchAction,
} from './v5_types';

import {
  isSimpleSyncAction as isV6SyncAction,
  isSyncAction as isV6AdvancedAction,
  isAsyncAction as isV6AsyncAction,
  isAsyncGetPromiseAction as isV6AsyncGetPromiseAction,
  isAsyncGetPromiseGetAction as isV6AsyncGetPromiseGetAction,
} from './impl';

export {
  AdvancedSynchAction,
  AsynchActionPromiseGet,
  StateDecoratorAction,
  StateDecoratorActions,
  StateDecoratorOptions,
  AsynchActionPromise,
  SynchAction,
  LoadingMap,
  LoadingMapParallelActions,
  LoadingProps,
  ConflictPolicy,
  setGlobalConfig,
};

/**
 * Type guard function to test if an action is a asynchronous action.
 */
export function isAsyncAction<S, F extends (...args: any[]) => any, A, P>(
  action: StateDecoratorAction<S, F, A, P>
): action is AsynchAction<S, F, A, P> {
  return !(action instanceof Function) && (action.hasOwnProperty('promise') || action.hasOwnProperty('promiseGet'));
}

/**
 * Type guard function to test if an action is a asynchronous action.
 */
export function isAsyncPromiseGetAction<S, F extends (...args: any[]) => any, A, P>(
  action: StateDecoratorAction<S, F, A, P>
): action is AsynchActionPromiseGet<S, F, A, P> {
  return !(action instanceof Function) && !(action.hasOwnProperty('promise') && action.hasOwnProperty('promiseGet'));
}

/**
 * Type guard function to test if an action is a synchronous action.
 */
export function isSyncAction<S, F extends (...args: any[]) => any, A, P>(
  action: StateDecoratorAction<S, F, A, P>
): action is SynchAction<S, F, P> {
  return action instanceof Function;
}

/**
 * Type guard function to test if an action is a synchronous action.
 */
export function isAdvancedSyncAction<S, F extends (...args: any[]) => any, A, P>(
  action: StateDecoratorAction<S, F, A, P>
): action is AdvancedSynchAction<S, F, A, P> {
  return !(action instanceof Function) && !action.hasOwnProperty('promise') && !action.hasOwnProperty('promiseGet');
}

/**
 * @private
 */
function computeAsyncActionInput<S, F extends (...args: any[]) => any, A, P>(
  action: AsynchAction<S, F, A, P>
): AsynchActionPromise<S, F, A, P> {
  if ('promiseGet' in action) {
    return {
      ...action,
      promise: action.promiseGet,
      retryCount: 3,
      conflictPolicy: ConflictPolicy.REUSE,
    };
  }
  return action;
}

/**
 * Utility to test an asynchronous action.
 * @param action The action to test
 * @param test The test function that takes the discrimined action type and cam return a promise
 */
export function testAsyncAction<S, F extends (...args: any[]) => any, A, P>(
  action: StateDecoratorAction<S, F, A, P>,
  test: (action: AsynchActionPromise<S, F, A, P>) => any | Promise<any>
) {
  if (isAsyncAction(action)) {
    return test(computeAsyncActionInput(action));
  }
  return Promise.reject(new Error('This action is not an asynchronous action'));
}

/**
 * Utility to test an synchronous action.
 * @param action The action to test
 * @param test The test function that takes the discrimined action type and cam return a promise
 */
export function testSyncAction<S, F extends (...args: any[]) => any, A, P>(
  action: StateDecoratorAction<S, F, A, P>,
  test: (action: SynchAction<S, F, P>) => any | Promise<any>
) {
  if (isSyncAction(action)) {
    return test(action);
  }
  return Promise.reject(new Error('This action is not a synchronous action'));
}

/**
 * Utility to test an advanced synchronous action.
 * @param action The action to test
 * @param test The test function that takes the discrimined action type and cam return a promise
 */
export function testAdvancedSyncAction<S, F extends (...args: any[]) => any, A, P>(
  action: StateDecoratorAction<S, F, A, P>,
  test: (action: AdvancedSynchAction<S, F, A, P>) => any | Promise<any>
) {
  if (isAdvancedSyncAction(action)) {
    return test(action);
  }
  return Promise.reject(new Error('This action is not a synchronous advanced action'));
}

/**
 * Utility to test a V6 synchronous action using v5 test.
 * @param action The action to test
 * @param test The test function that takes the discrimined action type and cam return a promise
 */
export function testV6SyncAction<S, F extends (...args: any[]) => any, A, P>(
  action: StoreAction<S, F, A, P>,
  test: (action: SynchAction<S, F, P>) => any | Promise<any>
) {
  if (isV6SyncAction(action)) {
    const decoratedAction: SynchAction<S, F, P> = (s, args, p) => ({
      ...s,
      ...action({
        s,
        args,
        p,
        ds: null,
        derived: null,
        state: s,
        props: p,
        promiseId: null,
      }),
    });

    test(decoratedAction);
    return Promise.resolve();
  }
  return Promise.reject(new Error('This action is not a synchronous action'));
}

/**
 * Utility to test a V6 synchronous action using v5 test.
 * @param actionIn The action to test
 * @param test The test function that takes the discrimined action type and cam return a promise
 */
export function testV6AdvancedSyncAction<S, F extends (...args: any[]) => any, A, P>(
  actionIn: StoreAction<S, F, A, P>,
  test: (action: AdvancedSynchAction<S, F, A, P>) => any | Promise<any>
) {
  if (isV6AdvancedAction(actionIn)) {
    const decoratedAction: AdvancedSynchAction<S, F, A, P> = {
      action: (s, args, p) => ({
        ...s,
        ...actionIn.effects({
          s,
          args,
          p,
          ds: null,
          derived: null,
          state: s,
          props: p,
          res: null,
          result: null,
          promiseId: null,
        }),
      }),

      onActionDone: (s, args, p, a, notifyWarning) => {
        actionIn.sideEffects({
          s,
          args,
          p,
          a,
          notifyWarning,
          ds: null,
          derived: null,
          state: s,
          props: p,
          actions: a,
          res: null,
          result: null,
          promiseId: null,
        });
      },
    };

    test(decoratedAction);

    return Promise.resolve();
  }
  return Promise.reject(new Error('This action is not a synchronous action'));
}

/**
 * Utility to test a V6 synchronous action using v5 test.
 * @param actionIn The action to test
 * @param test The test function that takes the discrimined action type and cam return a promise
 */
export function testV6AsyncAction<S, F extends (...args: any[]) => any, A, P>(
  actionIn: StoreAction<S, F, A, P>,
  test: (action: AsynchAction<S, F, A, P>) => any | Promise<any>
) {
  if (isV6AsyncAction(actionIn)) {
    const decoratedAction: AsynchAction<S, F, A, P> = {
      abortable: actionIn.abortable,
      rejectPromiseOnError: actionIn.rejectPromiseOnError,
      retryCount: actionIn.retryCount,
      retryDelaySeed: actionIn.retryDelaySeed,
      isTriggerRetryError: actionIn.isTriggerRetryError,
      conflictPolicy: actionIn.conflictPolicy,
      getPromiseId: actionIn.getPromiseId,

      promise: (args, s, p, a, abortSignal) => {
        if (isV6AsyncGetPromiseAction(actionIn)) {
          return actionIn.getPromise({
            s,
            args,
            p,
            a,
            abortSignal,
            ds: null,
            derived: null,
            state: s,
            props: p,
            actions: a,
            promiseId: null,
          });
        }
        return actionIn.getGetPromise({
          s,
          args,
          p,
          a,
          abortSignal,
          ds: null,
          derived: null,
          state: s,
          props: p,
          actions: a,
          promiseId: null,
        });
      },

      promiseGet: (args, s, p, a, abortSignal) => {
        if (isV6AsyncGetPromiseGetAction(actionIn)) {
          return actionIn.getGetPromise({
            s,
            args,
            p,
            a,
            abortSignal,
            ds: null,
            derived: null,
            state: s,
            props: p,
            actions: a,
            promiseId: null,
          });
        }
        return null;
      },

      reducer: (s, res, args, p) =>
        actionIn.effects
          ? {
              ...s,
              ...actionIn.effects({
                s,
                args,
                p,
                res,
                ds: null,
                derived: null,
                state: s,
                props: p,
                result: res,
                promiseId: null,
              }),
            }
          : null,

      preReducer: (s, args, p) =>
        actionIn.preEffects
          ? {
              ...s,
              ...actionIn.preEffects({
                s,
                args,
                p,
                ds: null,
                derived: null,
                state: s,
                props: p,
                promiseId: null,
              }),
            }
          : null,
      optimisticReducer: (s, args, p) =>
        actionIn.optimisticEffects
          ? {
              ...s,
              ...actionIn.optimisticEffects({
                s,
                args,
                p,
                ds: null,
                derived: null,
                state: s,
                props: p,
                promiseId: actionIn.getPromiseId?.(...args),
              }),
            }
          : null,

      errorReducer: (s, err, args, p) =>
        actionIn.errorEffects
          ? {
              ...s,
              ...actionIn.errorEffects({
                s,
                args,
                p,
                err,
                ds: null,
                derived: null,
                state: s,
                props: p,
                error: err,
                promiseId: actionIn.getPromiseId?.(...args),
              }),
            }
          : null,

      onDone: (s, res, args, p, a, notifyWarning) => {
        actionIn.sideEffects?.({
          s,
          args,
          p,
          a,
          res,
          notifyWarning,
          ds: null,
          derived: null,
          state: s,
          props: p,
          actions: a,
          result: res,
          promiseId: actionIn.getPromiseId?.(...args),
        });
      },

      onFail: (s, err, args, p, a, notifyWarning) => {
        actionIn.errorSideEffects?.({
          s,
          args,
          p,
          a,
          err,
          notifyWarning,
          ds: null,
          derived: null,
          state: s,
          props: p,
          actions: a,
          error: err,
          promiseId: actionIn.getPromiseId?.(...args),
        });
      },

      getErrorMessage: (err, args, p) =>
        actionIn.getErrorMessage?.({
          err,
          p,
          args,
          ds: null,
          derived: null,
          state: null,
          s: null,
          error: err,
          props: p,
          promiseId: actionIn.getPromiseId?.(...args),
        }),

      getSuccessMessage: (res, args, p) =>
        actionIn.getSuccessMessage?.({
          res,
          args,
          p,
          ds: null,
          derived: null,
          state: null,
          s: null,
          result: res,
          props: p,
          promiseId: actionIn.getPromiseId?.(...args),
        }),
    };
    return test(decoratedAction);
  }
  return Promise.reject(new Error('This action is not a synchronous action'));
}
