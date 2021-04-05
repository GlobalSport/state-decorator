import type {
  SyncAction as NewAdvancedSyncAction,
  AsyncActionPromise as NewAsynchActionPromise,
  DecoratedActions,
  EffectsInvocationContext,
  ErrorEffectsInvocationContext,
  ErrorSideEffectsInvocationContext,
  GetPromiseInvocationContext,
  InvocationContext,
  OnPropsChangeEffectsContext,
  OnPropsChangeSideEffectsContext,
  PromiseResult,
  SideEffectsInvocationContext,
  StoreActions,
  StoreOptions,
  StoreAction,
  MiddlewareFactory,
} from './types';

import { createStore, StoreApi, setGlobalConfig, ConflictPolicy } from './index';

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

import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { logDetailedEffects } from './middlewares';

function isAsyncActionPromise<S, F extends (...args: any[]) => any, A, P>(
  action: StateDecoratorAction<S, F, A, P>
): action is AsynchActionPromise<S, F, A, P> {
  return !(action instanceof Function) && action.hasOwnProperty('promise');
}

function isAsyncActionPromiseGet<S, F extends (...args: any[]) => any, A, P>(
  action: StateDecoratorAction<S, F, A, P>
): action is AsynchActionPromiseGet<S, F, A, P> {
  return !(action instanceof Function) && action.hasOwnProperty('promiseGet');
}

function convertV5Actions<S, A extends DecoratedActions, P>(
  sourceActions: StateDecoratorActions<S, A, P>
): StoreActions<S, A, P> {
  const actionNames: (keyof A)[] = Object.keys(sourceActions);

  return actionNames.reduce((acc, actionName) => {
    const sourceAction = sourceActions[actionName];

    if (isSyncAction(sourceAction)) {
      acc[actionName] = (ctx: InvocationContext<S, any, P>) =>
        sourceAction(ctx.s, ctx.args as Parameters<A[keyof A]>, ctx.p);
    } else if (isAdvancedSyncAction(sourceAction)) {
      const action: NewAdvancedSyncAction<S, any, A, P> = {
        effects: (ctx: EffectsInvocationContext<S, any, P>) =>
          sourceAction.action(ctx.s, ctx.args as Parameters<A[keyof A]>, ctx.p),
      };

      if (sourceAction.onActionDone) {
        action.sideEffects = ({ s, p, args, a, notifyWarning }: SideEffectsInvocationContext<S, any, P, A>) => {
          sourceAction.onActionDone(s, args as Parameters<A[keyof A]>, p, a, notifyWarning);
        };
      }

      acc[actionName] = action;
    } else if (isAsyncActionPromise(sourceAction) || isAsyncActionPromiseGet(sourceAction)) {
      let asyncAction: NewAsynchActionPromise<S, any, A, P>;

      if (isAsyncActionPromiseGet(sourceAction)) {
        asyncAction = {
          getPromise: ({ s, p, a, args, abortSignal }: GetPromiseInvocationContext<S, any, P, A>) =>
            sourceAction.promiseGet(args as Parameters<A[keyof A]>, s, p, a, abortSignal),
          retryCount: 3,
          conflictPolicy: ConflictPolicy.REUSE,
        };
      } else {
        asyncAction = {
          getPromise: ({ s, p, a, args, abortSignal }: GetPromiseInvocationContext<S, any, P, A>) =>
            sourceAction.promise(args as Parameters<A[keyof A]>, s, p, a, abortSignal),
        };
      }

      [
        'abortable',
        'conflictPolicy',
        'getPromiseId',
        'isTriggerRetryError',
        'rejectPromiseOnError',
        'retryCount',
        'debounceSideEffectsTimeout',
        'retryDelaySeed',
      ].forEach((prop) => {
        if ((sourceAction as any)[prop] != null) {
          (asyncAction as any)[prop] = (sourceAction as any)[prop];
        }
      });

      if (sourceAction.successMessage) {
        asyncAction.getSuccessMessage = () => sourceAction.successMessage;
      }

      if (sourceAction.errorMessage) {
        asyncAction.getSuccessMessage = () => sourceAction.errorMessage;
      }

      if (sourceAction.getSuccessMessage) {
        asyncAction.getSuccessMessage = ({ res, args, p }) =>
          sourceAction.getSuccessMessage(res as any, args as any, p);
      }

      if (sourceAction.getErrorMessage) {
        asyncAction.getErrorMessage = ({ err, args, p }) => sourceAction.getErrorMessage(err, args as any, p);
      }

      if (sourceAction.preReducer) {
        asyncAction.preEffects = ({ s, p, args }: InvocationContext<S, any, P>) =>
          sourceAction.preReducer(s, args as Parameters<A[keyof A]>, p);
      }

      if (sourceAction.optimisticReducer) {
        asyncAction.optimisticEffects = ({ s, p, args }: InvocationContext<S, any, P>) =>
          sourceAction.optimisticReducer(s, args as Parameters<A[keyof A]>, p);
      }

      if (sourceAction.reducer) {
        asyncAction.effects = ({ s, res, p, args }: EffectsInvocationContext<S, any, P>) =>
          sourceAction.reducer(s, res as PromiseResult<ReturnType<A[keyof A]>>, args as Parameters<A[keyof A]>, p);
      }

      if (sourceAction.errorReducer) {
        asyncAction.errorEffects = ({ s, err, p, args }: ErrorEffectsInvocationContext<S, any, P>) =>
          sourceAction.errorReducer(s, err, args as Parameters<A[keyof A]>, p);
      }

      if (sourceAction.onDone) {
        asyncAction.sideEffects = ({ s, res, p, args, a, notifyWarning }: SideEffectsInvocationContext<S, any, P, A>) =>
          sourceAction.onDone(
            s,
            res as PromiseResult<ReturnType<A[keyof A]>>,
            args as Parameters<A[keyof A]>,
            p,
            a,
            notifyWarning
          );
      }

      if (sourceAction.onFail) {
        asyncAction.errorSideEffects = ({
          s,
          err,
          p,
          args,
          a,
          notifyWarning,
        }: ErrorSideEffectsInvocationContext<S, any, P, A>) =>
          sourceAction.onFail(s, err, args as Parameters<A[keyof A]>, p, a, notifyWarning);
      }

      acc[actionName] = asyncAction;
    }

    return acc;
  }, {} as StoreActions<S, A, P>);
}

function convertV5Options<S, P, A>(sourceOptions: StateDecoratorOptions<S, A, P>): StoreOptions<S, A, P, {}> {
  const opts: StoreOptions<S, A, P, {}> = {};

  const keys = Object.keys(sourceOptions) as (keyof StateDecoratorOptions<S, A, P>)[];

  const doNotCopyProps: (keyof StateDecoratorOptions<S, A, P>)[] = [
    'onPropsChange',
    'onPropsChangeReducer',
    'getPropsRefValues',
    'onMount',
  ];

  keys.forEach((prop) => {
    if (!doNotCopyProps.includes(prop)) {
      (opts as any)[prop] = sourceOptions[prop];
    }
  });

  if (sourceOptions.onMount) {
    opts.onMount = ({ s, p, a }) => sourceOptions.onMount(a, p, s);
  }

  if (sourceOptions.getPropsRefValues) {
    opts.onPropsChange = {
      getDeps: sourceOptions.getPropsRefValues,
      effects: ({ s, p, indices }: OnPropsChangeEffectsContext<S, P>) =>
        sourceOptions.onPropsChangeReducer ? sourceOptions.onPropsChangeReducer(s, p, indices) : null,
      sideEffects: ({ s, p, a, indices }: OnPropsChangeSideEffectsContext<S, P, A>) =>
        sourceOptions.onPropsChange == null ? null : sourceOptions.onPropsChange(s, p, a, indices),
    };
  }

  return opts;
}

function useStateDecorator<S, A extends DecoratedActions, P>(
  getInitialState: (props: P) => S,
  actions: StateDecoratorActions<S, A, P>,
  props: P,
  options: StateDecoratorOptions<S, A, P> = {},
  middlewares?: MiddlewareFactory<S, A, P>[]
) {
  const [, forceRefresh] = useReducer((s) => 1 - s, 0);

  const actionsRef = useRef<StoreActions<S, A, P>>();
  const optionsRef = useRef<StoreOptions<S, A, P, {}>>();

  if (actionsRef.current == null) {
    actionsRef.current = convertV5Actions(actions);
  }

  if (optionsRef.current == null) {
    optionsRef.current = convertV5Options(options);
  }

  const storeRef = useRef<StoreApi<S, A, P>>();
  if (storeRef.current == null) {
    const middlewareFactories: MiddlewareFactory<S, A, P>[] = middlewares;
    if (options.logEnabled) {
      middlewareFactories.push(logDetailedEffects());
    }

    storeRef.current = createStore(getInitialState, actionsRef.current, optionsRef.current, middlewareFactories);
  }

  storeRef.current.setProps(props);

  useLayoutEffect(() => {
    const unregister = storeRef.current.addStateListener(() => {
      forceRefresh();
    });
    return unregister;
  }, []);

  const store = storeRef.current;

  return {
    state: store.state,
    actions: store.actions,
    loading: store.loading,
    loadingMap: store.loadingMap,
    loadingParallelMap: store.loadingParallelMap,
  };
}

export default useStateDecorator;

/**
 * Hook to execute a function when hook is mounted.
 * @param onMount function to execute on the hook nount
 */
export function useOnMount(onMount: () => any) {
  useEffect(() => {
    const removeListener = onMount();
    return typeof removeListener === 'function' ? removeListener : undefined;
  }, []);
}

/**
 * Hook to execute a function when hook is unmounted.
 * @param onUnMount function to execute on the hook nount
 */
export function useOnUnmount(onUnmount: () => void, propList: any[] = []) {
  useEffect(() => {
    return onUnmount;
  }, propList);
}

/**
 * Hook to execute a function when hook is unmounted.
 * @param onUnMount function to execute on the hook nount
 */
export function useOnUnload(onUnload: () => void) {
  useEffect(() => {
    document.addEventListener('beforeunload', onUnload);
    return () => {
      document.removeEventListener('beforeunload', onUnload);
    };
  }, []);
}

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
    const decoratedAction: SynchAction<S, F, P> = (s, args, p) =>
      action({
        s,
        args,
        p,
        state: s,
        props: p,
        promiseId: null,
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
      action: (s, args, p) =>
        actionIn.effects({
          s,
          args,
          p,
          state: s,
          props: p,
          res: null,
          result: null,
          promiseId: null,
        }),

      onActionDone: (s, args, p, a, notifyWarning) => {
        actionIn.sideEffects({
          s,
          args,
          p,
          a,
          notifyWarning,
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
            state: s,
            props: p,
            actions: a,
            promiseId: null,
          });
        }
        return null;
      },

      promiseGet: (args, s, p, a, abortSignal) => {
        if (isV6AsyncGetPromiseGetAction(actionIn)) {
          return actionIn.getGetPromise({
            s,
            args,
            p,
            a,
            abortSignal,
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
          ? actionIn.effects({
              s,
              args,
              p,
              res,
              state: s,
              props: p,
              result: res,
              promiseId: null,
            })
          : null,

      preReducer: (s, args, p) =>
        actionIn.preEffects
          ? actionIn.preEffects({
              s,
              args,
              p,
              state: s,
              props: p,
              promiseId: null,
            })
          : null,
      optimisticReducer: (s, args, p) =>
        actionIn.optimisticEffects
          ? actionIn.optimisticEffects({
              s,
              args,
              p,
              state: s,
              props: p,
              promiseId: actionIn.getPromiseId?.(...args),
            })
          : null,

      errorReducer: (s, err, args, p) =>
        actionIn.errorEffects
          ? actionIn.errorEffects({
              s,
              args,
              p,
              err,
              state: s,
              props: p,
              error: err,
              promiseId: actionIn.getPromiseId?.(...args),
            })
          : null,

      onDone: (s, res, args, p, a, notifyWarning) => {
        actionIn.sideEffects?.({
          s,
          args,
          p,
          a,
          res,
          notifyWarning,
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
