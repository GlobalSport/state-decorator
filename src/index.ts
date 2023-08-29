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
import useSyncExternalStoreWithSelectorExports from 'use-sync-external-store/shim/with-selector';
import useSyncExternalStoreExports from 'use-sync-external-store/shim/index';

import { Context, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import {
  computeAsyncActionInput,
  createRef,
  isSyncAction,
  isAsyncAction,
  isSimpleSyncAction,
  TimeoutMap,
  PromiseMap,
  DEFAULT_PROMISE_ID,
  globalConfig,
  setGlobalConfig,
  GlobalConfig,
  ConflictActionsMap,
  buildOnMountInvocationContext,
  decorateSimpleSyncAction,
  decorateSyncAction,
  decorateAsyncAction,
  computeDerivedValues,
  DerivedState,
  onPropChange,
  runMiddlewares,
  buildLoadingMap,
  isLoadingImpl,
  ParallelActionError,
  buildErrorMap,
  buildOnUnMountInvocationContext,
  EffectError,
  fixDerivedDeps,
  isFuncConfig,
} from './impl';

import type {
  DecoratedActions,
  StoreActions,
  AsyncAction,
  SyncAction,
  SimpleSyncAction,
  InternalLoadingMap,
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
  Middleware,
  AbortActionCallback,
  MiddlewareFactory,
  MiddlewareStoreContext,
  LoadingProps,
  AbortedActions,
  ErrorProps,
  LoadingMapProps,
  StoreConfig,
  ClearErrorFunc,
} from './types';

import { ConflictPolicy } from './types';

import { logDetailedEffects } from './development';

export type {
  DecoratedActions,
  StoreActions,
  LoadingMap,
  ErrorMap,
  LoadingParallelMap,
  ErrorParallelMap,
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
  GlobalConfig,
  Middleware,
  LoadingProps,
  AbortActionCallback,
  ErrorProps,
  LoadingMapProps,
  StoreConfig,
};

export { setGlobalConfig, EffectError, ParallelActionError, ConflictPolicy };

const { useSyncExternalStoreWithSelector } = useSyncExternalStoreWithSelectorExports;
const { useSyncExternalStore } = useSyncExternalStoreExports;

export type IsLoadingFunc<A> = (...props: (keyof A | [keyof A, string])[]) => boolean;
type StateListenerUnregister = () => void;

export type StoreApi<S, A extends DecoratedActions, P, DS = {}> = {
  /**
   * The current store state (with derived state if any).
   */
  readonly state: S & DS;
  /**
   * The store decorator (ie. ready to use) actions.
   */
  readonly actions: A;
  /**
   * A boolean that indicates that at least one asynchronous action is loading.
   */
  readonly loading: boolean;
  /**
   * A map of loading actions map (computed on property access)
   */
  readonly loadingMap: LoadingMap<A>;
  /**
   * A map of loading actions map (computed on property access)
   */
  readonly errorMap: ErrorMap<A>;
  /**
   * A map of parallel loading actions map (computed on property access)
   */
  readonly loadingParallelMap: LoadingParallelMap<A>;
  /**
   * A map of parallel actions error map (computed on property access)
   */
  readonly errorParallelMap: ErrorParallelMap<A>;

  /**
   * Initializes the store with the specified props
   */
  readonly init: (p: P) => void;

  /**
   * Update the store with the specified props
   */
  readonly setProps: (p: P) => void;

  /**
   * Destroy the store
   */
  readonly destroy: () => void;

  /**
   * Abort an asynchronous action marked as abortable.
   */
  readonly abortAction: (actionName: keyof A, promiseId?: string) => boolean;

  /**
   * Add a store state change listener
   */
  readonly addStateListener: (listener: StateListener) => StateListenerUnregister;

  /**
   * A function that takes a list of action names or a tuple of [action name, promiseId] and returns <code>true</code> if any action is loading.
   */
  readonly isLoading: IsLoadingFunc<A>;

  /**
   * A function to clear error on an action marked as <code>isErrorManaged: true</code>.
   */
  readonly clearError: ClearErrorFunc<A>;

  /**
   * @returns The store configuration
   */
  getConfig: () => StoreConfig<S, A, P, DS>;

  /**
   * Invoke onMountDeferred + onPropChange flagged onMountDeferred
   * @internal
   */
  invokeOnMountDeferred: () => void;

  /**
   * Returns a snapshot of the current state of the store.
   */
  getSnapshot(): StateListenerContext<S, DS, A>;
};

export type StateListenerContext<S, DS, A extends DecoratedActions> = S &
  DS &
  A &
  Pick<
    StoreApi<S, A, any, DS>,
    'loading' | 'loadingMap' | 'errorParallelMap' | 'errorMap' | 'isLoading' | 'abortAction'
  >;

export type StateListener = () => void;

// =============================
//
// STORE
//
// =============================

/**
 * Create a new store.
 * @param config Store configuration
 * @returns a store.
 */
export function createStore<S, A extends DecoratedActions, P, DS = {}>(
  config: StoreConfig<S, A, P, DS>
): StoreApi<S, A, P, DS> {
  const stateRef = createRef<S>();
  const derivedStateRef = createRef<DerivedState<DS>>();
  const propsRef = createRef<P>();
  const actionsRef = createRef<A>();
  const timeoutRef = createRef<TimeoutMap<A>>();
  const loadingParallelMapRef = createRef<InternalLoadingMap<A>>();
  const loadingMapRef = createRef<LoadingMap<A>>();
  const loadingRef = createRef<boolean>();
  const errorMapRef = createRef<ErrorParallelMap<A>>();
  const promisesRef = createRef<PromiseMap<A>>();
  const conflictActionsRef = createRef<ConflictActionsMap<A>>();
  const initializedRef = createRef(false);
  const snapshotRef = createRef<StateListenerContext<S, DS, A>>();

  const middlewaresRef = createRef<Middleware<S, A, P>[]>([]);

  const { actions: actionsImpl, middlewares = [], ...options } = config;

  const getInitialState: (p: P) => S = isFuncConfig(config) ? config.getInitialState : () => config.initialState;

  let stateListeners: Record<string, StateListener> = {};
  let stateListenerCount = 0;

  function addStateListener(listener: StateListener): () => void {
    const id = `${stateListenerCount++}`;
    stateListeners[id] = listener;
    return () => {
      delete stateListeners[id];
    };
  }

  function notifyStateListeners() {
    updateSnapshot();

    Object.keys(stateListeners).forEach((listenerId) => {
      // listeners can be removed while calling updates (!)
      stateListeners[listenerId]?.();
    });
  }

  function setProps(p: P) {
    const oldProps = propsRef.current;

    propsRef.current = p;

    if (!initializedRef.current) {
      init(p);
    } else {
      onPropChange(
        stateRef,
        derivedStateRef,
        propsRef,
        oldProps,
        actionsRef,
        options,
        getInitialState,
        setState,
        false,
        false
      );
    }
  }

  /** Middleware only: sets the internal state, recompute derived state and notify listeners */
  function setInternalState(s: S) {
    stateRef.current = s;
    computeDerivedValues(stateRef, propsRef, derivedStateRef, options);
    notifyStateListeners();
  }

  function setInternalLoadingMap(map: InternalLoadingMap<A>) {
    loadingParallelMapRef.current = map;
    loadingMapRef.current = getLoadingMap();
    loadingRef.current = isAnyLoading();
  }

  function init(p: P) {
    if (!initializedRef.current) {
      propsRef.current = p;
      initializedRef.current = true;
      stateRef.current = getInitialState(p);

      const initialActionSet = new Set(options?.initialActionsMarkedLoading);

      const loadingMap = (Object.keys(actionsImpl) as (keyof A)[]).reduce<InternalLoadingMap<A>>((acc, name) => {
        acc[name] = initialActionSet.has(name) ? { [DEFAULT_PROMISE_ID]: true } : {};
        return acc;
      }, {});

      setInternalLoadingMap(loadingMap);

      errorMapRef.current = (Object.keys(actionsImpl) as (keyof A)[]).reduce<ErrorParallelMap<A>>((acc, name) => {
        acc[name] = {};
        return acc;
      }, {});

      timeoutRef.current = {};
      promisesRef.current = {};
      conflictActionsRef.current = {};
      derivedStateRef.current = {
        state: null,
        deps: {},
      };

      // fix derived store
      if (options?.derivedState) {
        fixDerivedDeps(options);
      }

      // init middlewares
      middlewaresRef.current = [];
      const ctx: MiddlewareStoreContext<S, A, P> = {
        options,
        get state() {
          return stateRef.current;
        },
        actions: actionsImpl,
        setState: setInternalState,
      };

      if (config.logEnabled && logDetailedEffects) {
        middlewares.push(logDetailedEffects());
      }

      const mapper = (m: MiddlewareFactory<S, A, P>) => {
        const middleware = m();
        middlewaresRef.current.push(middleware);
        middleware.init?.(ctx);
      };

      globalConfig.defaultMiddlewares?.forEach(mapper);
      middlewares?.forEach(mapper);

      computeDerivedValues(stateRef, propsRef, derivedStateRef, options);

      // manage PropsChange with onMount
      onPropChange(
        stateRef,
        derivedStateRef,
        propsRef,
        null,
        actionsRef,
        options,
        getInitialState,
        setState,
        true,
        false
      );

      if (options?.onMount) {
        options.onMount(buildOnMountInvocationContext(stateRef, derivedStateRef, propsRef, actionsRef));
      }

      notifyStateListeners();
      // end init
    }
  }

  function clearError(actionName: keyof A, promiseId: string = DEFAULT_PROMISE_ID) {
    const map = errorMapRef.current[actionName];
    if (map?.[promiseId]) {
      delete map[promiseId];
    }
    notifyStateListeners();
  }

  function invokeOnMountDeferred() {
    // manage PropsChange with onMount
    onPropChange(stateRef, derivedStateRef, propsRef, null, actionsRef, options, getInitialState, setState, true, true);

    if (options?.onMountDeferred) {
      options.onMountDeferred(buildOnMountInvocationContext(stateRef, derivedStateRef, propsRef, actionsRef));
    }
  }

  function abortActionsOnDestroy() {
    const abortedActions: AbortedActions<A> = Object.keys(actionsImpl).reduce<AbortedActions<A>>((acc, actionName) => {
      const action = actionsImpl[actionName];
      if (isAsyncAction(action) && action.abortable) {
        const map = loadingParallelMapRef.current[actionName];
        const aborted = Object.keys(map).reduce((acc, promiseId) => {
          if (map[promiseId]) {
            // ongoing action
            abortAction(actionName, promiseId);
            acc.push(promiseId);
          }
          return acc;
        }, []);
        if (aborted.length > 0) {
          acc[actionName as keyof A] = aborted;
        }
      }
      return acc;
    }, {});
    return abortedActions;
  }

  function destroy() {
    if (initializedRef.current) {
      const abortedActions = abortActionsOnDestroy();

      options?.onUnmount?.(buildOnUnMountInvocationContext(stateRef, derivedStateRef, propsRef, abortedActions));

      Object.keys(timeoutRef.current).forEach((name) => {
        clearTimeout(timeoutRef.current[name]);
      });

      propsRef.current = null;
      stateRef.current = null;
      loadingParallelMapRef.current = null;
      loadingMapRef.current = null;
      loadingRef.current = null;
      errorMapRef.current = null;
      promisesRef.current = null;
      conflictActionsRef.current = null;
      derivedStateRef.current = null;
      snapshotRef.current = null;

      timeoutRef.current = null;
      stateListeners = {};
      initializedRef.current = false;

      middlewaresRef.current.forEach((m) => {
        m.destroy?.();
      });

      middlewaresRef.current = [];
    }
  }

  function setState(
    newStateIn: S,
    newLoadingMapIn: InternalLoadingMap<A>,
    actionName: keyof A,
    actionType: 'preEffects' | 'effects' | 'errorEffects' | null,
    isAsync: boolean,
    actionCtx: any,
    propsChanged: boolean = false,
    init = false
  ) {
    let hasChanged = false;

    if (!initializedRef.current) {
      return;
    }

    let newLoadingMap = newLoadingMapIn;

    const oldLoading = isAsync
      ? isLoadingImpl(newLoadingMap || loadingParallelMapRef.current, [actionName, actionCtx?.promiseId])
      : false;

    const { newState, newLoading } = runMiddlewares(
      middlewaresRef.current,
      stateRef.current,
      newStateIn,
      oldLoading,
      actionName,
      actionType,
      isAsync,
      actionCtx
    );

    if (newState != null) {
      hasChanged = true;
      stateRef.current = newState;
    }

    if (oldLoading !== newLoading) {
      newLoadingMap = buildLoadingMap(
        newLoadingMap,
        actionName,
        actionCtx?.promiseId || DEFAULT_PROMISE_ID,
        newLoading
      );

      if (Object.keys(newLoadingMap).length === 0) {
        newLoadingMap = undefined;
      }
    }

    if (newLoadingMap != null) {
      hasChanged = true;
      setInternalLoadingMap(newLoadingMap);
    }

    if (hasChanged) {
      computeDerivedValues(stateRef, propsRef, derivedStateRef, options);
      if (!init) {
        stateRef.current = newState || stateRef.current;
        notifyStateListeners();
      }
    } else if (propsChanged) {
      const derivedChanged = computeDerivedValues(stateRef, propsRef, derivedStateRef, options);
      if (derivedChanged && !init) {
        notifyStateListeners();
      }
    }
  }

  const keys = Object.keys(actionsImpl) as (keyof A)[];
  actionsRef.current = keys.reduce<A>((acc, actionName) => {
    const action = actionsImpl[actionName];
    if (isSimpleSyncAction(action)) {
      acc[actionName] = decorateSimpleSyncAction(
        actionName,
        action,
        stateRef,
        derivedStateRef,
        propsRef,
        initializedRef,
        options,
        setState
      ) as any;
    } else if (isAsyncAction(action)) {
      acc[actionName] = decorateAsyncAction({
        actionName,
        stateRef,
        derivedStateRef,
        propsRef,
        loadingParallelMapRef,
        errorMapRef,
        actionsRef,
        promisesRef,
        conflictActionsRef,
        initializedRef,
        options,
        setState,
        clearError,
        action: computeAsyncActionInput(action),
      }) as any;
    } else if (isSyncAction(action)) {
      acc[actionName] = decorateSyncAction(
        actionName,
        action,
        stateRef,
        derivedStateRef,
        propsRef,
        actionsRef,
        initializedRef,
        timeoutRef,
        options,
        setState,
        clearError
      ) as any;
    }

    return acc;
  }, {} as A);

  function isLoading<K extends keyof A>(...props: (K | [K, string])[]) {
    return isLoadingImpl(loadingParallelMapRef.current, ...props);
  }

  function abortAction(actionName: keyof A, promiseId: string = DEFAULT_PROMISE_ID) {
    const abortController = promisesRef.current[actionName]?.[promiseId]?.abortController;

    let res = false;
    if (abortController) {
      abortController.abort();
      res = true;
    }

    return res;
  }

  function isAnyLoading() {
    if (initializedRef.current) {
      const loadingMap = loadingParallelMapRef.current;
      return (
        Object.keys(loadingMap).find((actionName) => {
          const promises = loadingMap[actionName];
          return Object.keys(promises).find((pId) => !!promises[pId]);
        }) != null
      );
    }
    return null;
  }

  function getLoadingMap() {
    if (initializedRef.current) {
      const map = loadingParallelMapRef.current;
      const keys = Object.keys(map) as (keyof A)[];
      return keys.reduce<LoadingMap<A>>((acc, actionName) => {
        const subMap = map[actionName];
        acc[actionName] = Object.keys(subMap).find((pId) => !!subMap[pId]) != null;
        return acc;
      }, {});
    }
    return null;
  }

  function getErrorMap() {
    if (initializedRef.current) {
      return buildErrorMap(errorMapRef.current);
    }
    return null;
  }

  function getConfig() {
    return { ...config };
  }

  function updateSnapshot() {
    snapshotRef.current = {
      ...actionsRef.current,
      ...stateRef.current,
      ...derivedStateRef.current.state,
      isLoading,
      abortAction,
      loading: loadingRef.current,
      loadingMap: loadingMapRef.current,
      loadingParallelMap: loadingParallelMapRef.current,
      errorMap: getErrorMap(),
      errorParallelMap: errorMapRef.current,
    };
  }

  function getSnapshot() {
    return snapshotRef.current;
  }

  return {
    getConfig,
    setProps,
    addStateListener,
    init,
    destroy,
    isLoading,
    abortAction,
    clearError,
    getSnapshot,
    invokeOnMountDeferred,
    get actions() {
      return actionsRef.current;
    },
    get state() {
      if (initializedRef.current) {
        return {
          ...stateRef.current,
          ...derivedStateRef.current.state,
        };
      }
      return null;
    },
    get loading() {
      return loadingRef.current;
    },
    get loadingMap() {
      return loadingMapRef.current;
    },
    get errorMap() {
      return getErrorMap();
    },
    get loadingParallelMap() {
      if (initializedRef.current) {
        return loadingParallelMapRef.current;
      }
      return null;
    },
    get errorParallelMap() {
      if (initializedRef.current) {
        return errorMapRef.current;
      }
      return null;
    },
  };
}

// =====================================
//
// REACT HOOKS
//
// =====================================

type useStoreSlice<S, A extends DecoratedActions, P, DS, SLICE> = (
  store: StoreApi<S, A, P, DS>,
  slicer: (ctx: StateListenerContext<S, DS, A>) => SLICE
) => SLICE;

/**
 * A react hook to get a state slice. Will be refresh if, and only if, one property of the slice has changed
 * @param store The store to listen to.
 * @param slicerFunc A function that returns a state slice
 * @returns The state slice.
 */
export function useStoreSlice<S, A extends DecoratedActions, P, DS, SLICE>(
  store: StoreApi<S, A, P, DS>,
  slicerFunc: (ctx: StateListenerContext<S, DS, A>) => SLICE
): SLICE;

/**
 * A react hook to get a state slice. Will be refresh if, and only if, one property of the slice has changed
 * @param store The store to listen to.
 * @param properties list of properties to extract from store
 * @returns The state slice.
 */
export function useStoreSlice<
  S,
  A extends DecoratedActions,
  P,
  DS,
  K extends keyof StateListenerContext<S, DS, A>,
  KL extends keyof A
>(
  store: StoreApi<S, A, P, DS>,
  properties: K[]
): Pick<StateListenerContext<S, DS, A>, K> & { loadingMap: LoadingMap<Pick<A, KL>> };

export function useStoreSlice<S, A extends DecoratedActions, P, DS>(store: StoreApi<S, A, P, DS>, funcOrArr: any) {
  const slicerFunc = useMemo(
    () => (funcOrArr instanceof Function ? funcOrArr : (ctx: StateListenerContext<S, DS, A>) => pick(ctx, funcOrArr)),
    [funcOrArr]
  );

  return useSyncExternalStoreWithSelector(
    store.addStateListener,
    store.getSnapshot,
    store.getSnapshot,
    slicerFunc,
    globalConfig.comparator
  );
}

/**
 * Binds the store to this component.
 * Store will NOT be destroyed when component is unmouted.
 * The component will be refreshed for every change in the store.
 *
 * @param store The store to listen to.
 * @returns The store.
 */
export function useStore<S, A extends DecoratedActions, P, DS>(store: StoreApi<S, A, P, DS>) {
  // returns the snapshot, but we do prefer the store itself
  useSyncExternalStore(store.addStateListener, store.getSnapshot);
  return store;
}

/**
 * A react hook to get a state slice from a store context.
 * The component be refreshed if, and only if, one property of the slice has changed.
 * @param store The store to listen to.
 * @param slicerFunc A function that returns a state slice
 * @returns The state slice.
 */
export function useStoreContextSlice<S, A extends DecoratedActions, P, DS, SLICE>(
  storeContext: Context<StoreApi<S, A, P, DS>>,
  slicerFunc: (ctx: StateListenerContext<S, DS, A>) => SLICE
): SLICE;

/**
 * A react hook to get a state slice from a store context.
 * The component will be refreshed if, and only if, one property of the slice has changed.
 * @param store The store to listen to.
 * @param properties list of properties to extract from store
 * @returns The state slice.
 */
export function useStoreContextSlice<
  S,
  A extends DecoratedActions,
  P,
  DS,
  K extends keyof StateListenerContext<S, DS, A>,
  KL extends keyof A
>(
  storeContext: Context<StoreApi<S, A, P, DS>>,
  properties: K[]
): Pick<StateListenerContext<S, DS, A>, K> & { loadingMap: LoadingMap<Pick<A, KL>> };

export function useStoreContextSlice<S, A extends DecoratedActions, P, DS>(
  storeContext: Context<StoreApi<S, A, P, DS>>,
  funcOrArr: any
) {
  const store = useContext(storeContext);
  return useStoreSlice(store, funcOrArr);
}

/**
 * Binds the store to this component.
 * Store will NOT be destroyed when component is unmouted.
 * Props passed to actions will come from this components.
 * If store is configured to react of props changes, it will used passed props.
 * The component will be refreshed for every change in the store.
 *
 * @param store The store to listen to.
 * @param props The parent component props
 * @param refreshOnUpdate Whether refresh the component if store state changes.
 * @returns The store.
 */
function useStoreImpl<S, A extends DecoratedActions, P, DS = {}>(
  store: StoreApi<S, A, P, DS>,
  props: P = null,
  refreshOnUpdate: boolean = true
) {
  const [, forceRefresh] = useReducer((s) => (s > 100 ? 0 : s + 1), 0);

  const storeRef = useRef(store);

  store.setProps(props);

  useLayoutEffect(() => {
    // In development mode, React is calling in order:
    // - render
    // - useLayoutEffect
    // - useEffect
    // - useLayoutEffect => delete callback
    // - useEffect => delete callback
    // - useLayoutEffect
    // - useEffect
    //
    // Here we enforce a initialization of the store after a destroy in the useEffect delete callback

    store.init(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (refreshOnUpdate) {
      return storeRef.current.addStateListener(() => {
        forceRefresh();
      });
    }
    return undefined;
  }, [refreshOnUpdate]);

  return store;
}

/**
 * Creates and manages a local store.
 * The component will be refreshed for every change in the store.
 * Store will NOT be destroyed when component is unmouted.
 *
 * @param getInitialState Function to compute initial state from props.
 * @param props Owner component props to update state or react on prop changes
 * @param refreshOnUpdate Whether refresh the component if store state changes.
 * @returns The Store
 */
export function useLocalStore<S, A extends DecoratedActions, P, DS = {}>(
  config: StoreConfig<S, A, P, DS>,
  props?: P,
  refreshOnUpdate: boolean = true
) {
  const storeRef = useRef<StoreApi<S, A, P, DS>>();
  if (storeRef.current == null) {
    storeRef.current = createStore(config);
  }

  useEffect(() => {
    storeRef.current.invokeOnMountDeferred();

    return () => {
      storeRef.current?.destroy();
    };
  }, []);

  return useStoreImpl(storeRef.current, props, refreshOnUpdate);
}

/**
 * Binds a store to a component and inject props.
 * This hook must be the only one used with this store (or else props will the set several times).
 * The component will be refreshed for every change in the store.
 * Store will NOT be destroyed when component is unmouted.
 *
 * @param getInitialState Function to compute initial state from props.
 * @param actionImpl Actions implementation.
 * @param props Owner component props to update state or react on prop changes
 * @returns the Store.
 */
export function useBindStore<S, A extends DecoratedActions, P, DS = {}>(store: StoreApi<S, A, P, DS>, props?: P) {
  store.setProps(props);

  useSyncExternalStore(store.addStateListener, store.getSnapshot);

  useLayoutEffect(() => {
    // In development mode, React is calling in order:
    // - render
    // - useLayoutEffect
    // - useEffect
    // - useLayoutEffect => delete callback
    // - useEffect => delete callback
    // - useLayoutEffect
    // - useEffect
    //
    // Here we enforce a initialization of the store after a destroy in the useEffect delete callback

    store.init(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    store.invokeOnMountDeferred();
  }, [store]);

  return store;
}

export default useLocalStore;

// ------------- UTILS

/**
 * Creates a new object by picking properties to the object passed a first parameter
 * @param obj Object to pick properties from
 * @param props Property names
 * @returns a new object containing only picked properties
 */
export function pick<T, K extends keyof T>(obj: T, props: K[]): Pick<T, K> {
  return props.reduce((acc, p) => {
    if (obj.hasOwnProperty(p)) {
      acc[p] = obj[p];
    }
    return acc;
  }, {} as any);
}

/**
 * Returns a function that creates a new object by picking properties to the object passed as first parameter.
 * To be used in conjunction of <code>useStoreSlice</code> like in example:
 *   const s = useStoreSlice(myStore, slice('list', 'addItem'));
 * @param props Property names
 * @returns a function to pick property from an passed object.
 */
export function slice<T, K extends keyof T>(...props: K[]): (obj: T) => Pick<T, K> {
  return (store: T) => pick(store, props);
}
