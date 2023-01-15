import { GlobalConfig, ParallelActionError, EffectError } from './impl';

import {
  DecoratedActions,
  StoreActions,
  AsyncAction,
  SyncAction,
  SimpleSyncAction,
  LoadingMap,
  ErrorMap,
  LoadingParallelMap,
  ErrorParallelMap,
  StoreOptions,
  AsyncActionPromise,
  InvocationContext,
  GetPromiseInvocationContext,
  EffectsInvocationContext,
  InvocationContextActions,
  WarningNotifyFunc,
  ErrorEffectsInvocationContext,
  OnMountInvocationContext,
  ContextBase,
  OnPropsChangeEffectsContext,
  ContextState,
  ConflictPolicy,
  Middleware,
  AbortActionCallback,
  MiddlewareFactory,
  LoadingProps,
  ErrorProps,
  LoadingMapProps,
  StoreConfig,
} from './types';

import useLocalStoreV7, { setGlobalConfig, IsLoadingFunc, StoreApi, StateListenerContext } from './index';

export {
  StateListenerContext,
  StoreApi,
  EffectError,
  DecoratedActions,
  StoreActions,
  LoadingMap,
  ErrorMap,
  LoadingParallelMap,
  ErrorParallelMap,
  ParallelActionError,
  StoreOptions,
  AsyncActionPromise as AsynchActionPromise,
  InvocationContext,
  GetPromiseInvocationContext,
  EffectsInvocationContext,
  InvocationContextActions,
  WarningNotifyFunc,
  ErrorEffectsInvocationContext,
  OnMountInvocationContext,
  ContextBase,
  OnPropsChangeEffectsContext,
  SyncAction,
  AsyncAction,
  SimpleSyncAction,
  ContextState,
  ConflictPolicy,
  GlobalConfig,
  Middleware,
  setGlobalConfig,
  LoadingProps,
  AbortActionCallback,
  ErrorProps,
  LoadingMapProps,
  StoreConfig,
  IsLoadingFunc,
};

/**
 * Creates and manages a local store.
 * The component will be refreshed for every change in the store.
 * Store will NOT be destroyed when component is unmouted.
 *
 * @param getInitialState Function to compute initial state from props.
 * @param actionImpl Actions implementation.
 * @param props Owner component props to update state or react on prop changes
 * @param options The store options.
 * @param refreshOnUpdate Whether refresh the component if store state changes.
 * @returns The state, actions and isLoading function.
 */
export default function useLocalStoreV6<S, A extends DecoratedActions, P, DS = {}>(
  getInitialState: (p: P) => S,
  actionImpl: StoreActions<S, A, P, DS>,
  props?: P,
  options?: StoreOptions<S, A, P, DS>,
  middlewares?: MiddlewareFactory<S, A, P>[],
  refreshOnUpdate: boolean = true
) {
  return useLocalStoreV7({ getInitialState, actions: actionImpl, ...options, middlewares }, props, refreshOnUpdate);
}

export const useLocalStore = useLocalStoreV6;
