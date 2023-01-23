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

import {
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
import { logDetailedEffects } from './development';

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

function convertV5Actions<S, A extends DecoratedActions, P>(
  sourceActions: StateDecoratorActions<S, A, P>
): StoreActions<S, A, P> {
  const actionNames: (keyof A)[] = Object.keys(sourceActions);

  return actionNames.reduce((acc, actionName) => {
    const sourceAction = sourceActions[actionName];

    if (isSyncAction(sourceAction)) {
      acc[actionName] = (ctx: InvocationContext<S, any, any, P>) =>
        sourceAction(ctx.s, ctx.args as Parameters<A[keyof A]>, ctx.p);
    } else if (isAdvancedSyncAction(sourceAction)) {
      const action: NewAdvancedSyncAction<S, any, A, P, any> = {
        effects: (ctx: EffectsInvocationContext<S, any, any, P>) =>
          sourceAction.action(ctx.s, ctx.args as Parameters<A[keyof A]>, ctx.p),
      };

      if (sourceAction.onActionDone) {
        action.sideEffects = ({ s, p, args, a, notifyWarning }: SideEffectsInvocationContext<S, any, any, P, A>) => {
          sourceAction.onActionDone(s, args as Parameters<A[keyof A]>, p, a, notifyWarning);
        };
      }

      acc[actionName] = action;
    } else if (isAsyncActionPromise(sourceAction) || isAsyncActionPromiseGet(sourceAction)) {
      let asyncAction: NewAsynchActionPromise<S, any, A, P>;

      if (isAsyncActionPromiseGet(sourceAction)) {
        asyncAction = {
          getPromise: ({ s, p, a, args, abortSignal }: GetPromiseInvocationContext<S, any, any, P, A>) =>
            sourceAction.promiseGet(args as Parameters<A[keyof A]>, s, p, a, abortSignal),
          retryCount: 3,
          conflictPolicy: ConflictPolicy.REUSE,
        };
      } else {
        asyncAction = {
          getPromise: ({ s, p, a, args, abortSignal }: GetPromiseInvocationContext<S, any, any, P, A>) =>
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
        'debounceTimeout',
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
        asyncAction.preEffects = ({ s, p, args }: InvocationContext<S, any, any, P>) =>
          sourceAction.preReducer(s, args as Parameters<A[keyof A]>, p);
      }

      if (sourceAction.optimisticReducer) {
        asyncAction.optimisticEffects = ({ s, p, args }: InvocationContext<S, any, any, P>) =>
          sourceAction.optimisticReducer(s, args as Parameters<A[keyof A]>, p);
      }

      if (sourceAction.reducer) {
        asyncAction.effects = ({ s, res, p, args }: EffectsInvocationContext<S, any, any, P>) =>
          sourceAction.reducer(s, res as PromiseResult<ReturnType<A[keyof A]>>, args as Parameters<A[keyof A]>, p);
      }

      if (sourceAction.errorReducer) {
        asyncAction.errorEffects = ({ s, err, p, args }: ErrorEffectsInvocationContext<S, any, any, P>) =>
          sourceAction.errorReducer(s, err, args as Parameters<A[keyof A]>, p);
      }

      if (sourceAction.onDone) {
        asyncAction.sideEffects = ({
          s,
          res,
          p,
          args,
          a,
          notifyWarning,
        }: SideEffectsInvocationContext<S, any, any, P, A>) =>
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
        }: ErrorSideEffectsInvocationContext<S, any, any, P, A>) =>
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
    'initialActionsMarkedLoading',
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
      effects: ({ s, p, indices }: OnPropsChangeEffectsContext<S, any, P>) =>
        sourceOptions.onPropsChangeReducer ? sourceOptions.onPropsChangeReducer(s, p, indices) : null,
      sideEffects: ({ s, p, a, indices }: OnPropsChangeSideEffectsContext<S, P, A>) =>
        sourceOptions.onPropsChange == null ? null : sourceOptions.onPropsChange(s, p, a, indices),
    };
  }

  if (sourceOptions.initialActionsMarkedLoading) {
    opts.initialActionsMarkedLoading = sourceOptions.initialActionsMarkedLoading;
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
  const [, forceRefresh] = useReducer((s) => (s > 100 ? 0 : s + 1), 0);

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

    storeRef.current = createStore({
      getInitialState,
      actions: actionsRef.current,
      ...optionsRef.current,
      middlewares: middlewareFactories,
    });
  }

  storeRef.current.setProps(props);

  useLayoutEffect(
    () =>
      storeRef.current.addStateListener(() => {
        forceRefresh();
      }),
    []
  );

  const store = storeRef.current;

  return {
    state: store.state,
    actions: store.actions,
    loading: store.loading,
    loadingMap: store.loadingMap,
    loadingParallelMap: store.loadingParallelMap,
    abortAction: store.abortAction,
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
