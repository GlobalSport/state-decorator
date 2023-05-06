import { GlobalConfig, ParallelActionError, EffectError } from './impl';

import type {
  DecoratedActions,
  StoreActions,
  AsyncAction,
  SyncAction,
  SimpleSyncAction,
  LoadingMap,
  ErrorMap,
  LoadingParallelMap,
  ErrorParallelMap,
  StoreOptions as StoreOptionsBase,
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
  Middleware,
  AbortActionCallback,
  MiddlewareFactory,
  LoadingProps,
  ErrorProps,
  LoadingMapProps,
  StoreConfig,
} from './types';

import useLocalStoreV7, {
  setGlobalConfig,
  IsLoadingFunc,
  StoreApi,
  StateListenerContext,
  ConflictPolicy,
} from './index';

export type {
  StateListenerContext,
  StoreApi,
  DecoratedActions,
  StoreActions,
  LoadingMap,
  ErrorMap,
  LoadingParallelMap,
  ErrorParallelMap,
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
  GlobalConfig,
  Middleware,
  LoadingProps,
  AbortActionCallback,
  ErrorProps,
  LoadingMapProps,
  StoreConfig,
  IsLoadingFunc,
};

export { EffectError, ParallelActionError, ConflictPolicy, setGlobalConfig };

export type StoreOptions<S, A, P = {}, DS = {}, FxRes = S> = StoreOptionsBase<S, A, P, DS, FxRes>;

export type StoreAction<S, F extends (...args: any[]) => any, A, P, DS = {}, FxRes = S> =
  | AsyncAction<S, F, A, P, DS, FxRes>
  | SimpleSyncAction<S, F, P, DS, FxRes>
  | SyncAction<S, F, A, P, DS, FxRes>;

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
  return useLocalStoreV7(
    { getInitialState, actions: actionImpl, ...options, middlewares, fullStateEffects: true },
    props,
    refreshOnUpdate
  );
}

export const useLocalStore = useLocalStoreV6;
