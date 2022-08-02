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
} from './impl';

import {
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
  ConflictPolicy,
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

export {
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
};

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
  init: (p: P) => void;
  /**
   * Update the store with the specified props
   */
  setProps: (p: P) => void;
  /**
   * Destroy the store
   */
  destroy: () => void;
  /**
   * Abort an asynchronous action marked as abortable.
   */
  abortAction: (actionName: keyof A, promiseId?: string) => boolean;
  /**
   * Add a store state change listener
   */
  addStateListener: (listener: StateListener<S, DS, A>) => StateListenerUnregister;
  /**
   * A function that takes a list of action names or a tuple of [action name, promiseId] and returns <code>true</code> if any action is loading.
   */
  isLoading: IsLoadingFunc<A>;

  clearError: ClearErrorFunc<A>;

  getConfig: () => {
    getInitialState: (p: P) => S;
    options: StoreOptions<S, A, P, DS>;
    actions: StoreActions<S, A, P, DS>;
  };

  /**
   * Invoke onMountDeferred + onPropChange flagged onMountDeferred
   * @internal
   */
  invokeOnMountDeferred: () => void;
};

export type StateListenerContext<S, DS, A extends DecoratedActions> = S &
  DS &
  A &
  Pick<StoreApi<S, A, any, DS>, 'loading' | 'loadingMap' | 'errorMap' | 'isLoading' | 'abortAction'>;

export type StateListener<S, DS, A extends DecoratedActions> = (ctx: StateListenerContext<S, DS, A>) => void;

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
  const loadingMapRef = createRef<InternalLoadingMap<A>>();
  const errorMapRef = createRef<ErrorParallelMap<A>>();
  const promisesRef = createRef<PromiseMap<A>>();
  const conflictActionsRef = createRef<ConflictActionsMap<A>>();
  const initializedRef = createRef(false);

  const middlewaresRef = createRef<Middleware<S, A, P>[]>([]);

  const { getInitialState, actions: actionsImpl, middlewares = [], ...options } = config;

  let stateListeners: Record<string, StateListener<S, DS, A>> = {};
  let stateListenerCount = 0;

  function addStateListener(listener: StateListener<S, DS, A>): () => void {
    const id = `${stateListenerCount++}`;
    stateListeners[id] = listener;
    return () => {
      delete stateListeners[id];
    };
  }

  function notifyStateListeners(newState: S, derivedState: DS) {
    const s = {
      ...newState,
      ...derivedState,
    };

    const ctx: StateListenerContext<S, DS, A> = {
      ...s,
      ...actionsRef.current,
      isLoading,
      abortAction,
      loading: isAnyLoading(),
      loadingMap: getLoadingMap(),
      errorMap: getErrorMap(),
    };

    Object.keys(stateListeners).forEach((listenerId) => {
      stateListeners[listenerId](ctx);
    });
  }

  function setProps(p: P) {
    const oldProps = propsRef.current;

    propsRef.current = p;

    if (!initializedRef.current) {
      init(p);
    } else {
      onPropChange(stateRef, derivedStateRef, propsRef, oldProps, actionsRef, options, setState, false, false);
    }
  }

  /** Middleware only: sets the internal state, recompute derived state and notify listeners */
  function setInternalState(s: S) {
    stateRef.current = s;
    computeDerivedValues(stateRef, propsRef, derivedStateRef, options);
    notifyStateListeners(stateRef.current, derivedStateRef.current.state);
  }

  function init(p: P) {
    if (!initializedRef.current) {
      propsRef.current = p;
      initializedRef.current = true;
      stateRef.current = getInitialState(p);

      const initialActionSet = new Set(options?.initialActionsMarkedLoading);

      loadingMapRef.current = (Object.keys(actionsImpl) as (keyof A)[]).reduce<InternalLoadingMap<A>>((acc, name) => {
        acc[name] = initialActionSet.has(name) ? { [DEFAULT_PROMISE_ID]: true } : {};
        return acc;
      }, {});

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
      const mapper = (m: MiddlewareFactory<S, A, P>) => {
        const middleware = m();
        middlewaresRef.current.push(middleware);
        middleware.init?.(ctx);
      };
      globalConfig.defaultMiddlewares?.forEach(mapper);
      middlewares?.forEach(mapper);
      // end init

      computeDerivedValues(stateRef, propsRef, derivedStateRef, options);

      onPropChange(stateRef, derivedStateRef, propsRef, null, actionsRef, options, setState, true, false);

      if (options?.onMount) {
        options.onMount(buildOnMountInvocationContext(stateRef, derivedStateRef, propsRef, actionsRef));
      }

      notifyStateListeners(stateRef.current, derivedStateRef.current.state);
    }
  }

  function clearError(actionName: keyof A, promiseId: string = DEFAULT_PROMISE_ID) {
    const map = errorMapRef.current[actionName];
    if (map?.[promiseId]) {
      delete map[promiseId];
    }
    notifyStateListeners(stateRef.current, derivedStateRef.current.state);
  }

  function invokeOnMountDeferred() {
    // manage PropsChange with onMount
    onPropChange(stateRef, derivedStateRef, propsRef, null, actionsRef, options, setState, true, true);

    if (options?.onMountDeferred) {
      options.onMountDeferred(buildOnMountInvocationContext(stateRef, derivedStateRef, propsRef, actionsRef));
    }
  }

  function abortActionsOnDestroy() {
    const abortedActions: AbortedActions<A> = Object.keys(actionsImpl).reduce((acc, actionName) => {
      const action = actionsImpl[actionName];
      if (isAsyncAction(action) && action.abortable) {
        const map = loadingMapRef.current[actionName];
        const aborted = Object.keys(map).reduce((acc, promiseId) => {
          if (map[promiseId]) {
            // ongoing action
            abortAction(actionName, promiseId);
            acc.push(promiseId);
          }
          return acc;
        }, []);
        if (aborted.length > 0) {
          acc[actionName] = aborted;
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

      propsRef.current = null;
      stateRef.current = null;
      loadingMapRef.current = null;
      errorMapRef.current = null;
      promisesRef.current = null;
      conflictActionsRef.current = null;
      derivedStateRef.current = null;

      Object.keys(timeoutRef.current).forEach((name) => {
        clearTimeout(timeoutRef.current[name]);
      });

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
      ? isLoadingImpl(newLoadingMap || loadingMapRef.current, [actionName, actionCtx?.promiseId])
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
      loadingMapRef.current = newLoadingMap;
    }

    if (hasChanged) {
      computeDerivedValues(stateRef, propsRef, derivedStateRef, options);
      if (!init) {
        notifyStateListeners(newState || stateRef.current, derivedStateRef.current.state);
      }
    } else if (propsChanged) {
      const derivedChanged = computeDerivedValues(stateRef, propsRef, derivedStateRef, options);
      if (derivedChanged && !init) {
        notifyStateListeners(newState || stateRef.current, derivedStateRef.current.state);
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
        setState
      ) as any;
    } else if (isAsyncAction(action)) {
      acc[actionName] = decorateAsyncAction({
        actionName,
        stateRef,
        derivedStateRef,
        propsRef,
        loadingMapRef,
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
    return isLoadingImpl(loadingMapRef.current, ...props);
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
      const loadingMap = loadingMapRef.current;
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
      const map = loadingMapRef.current;
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
    return {
      getInitialState,
      options,
      actions: actionsImpl,
    };
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
      return isAnyLoading();
    },
    get loadingMap() {
      return getLoadingMap();
    },
    get errorMap() {
      return getErrorMap();
    },
    get loadingParallelMap() {
      if (initializedRef.current) {
        return loadingMapRef.current;
      }
      return null;
    },
    get errorParallelMap() {
      if (initializedRef.current) {
        return errorMapRef.current;
      }
      return null;
    },
    invokeOnMountDeferred() {
      invokeOnMountDeferred();
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
  properties: K[],
  loadingProps?: KL[]
): Pick<StateListenerContext<S, DS, A>, K> & { loadingMap: LoadingMap<Pick<A, KL>> };

export function useStoreSlice<S, A extends DecoratedActions, P, DS>(
  store: StoreApi<S, A, P, DS>,
  funcOrArr: any,
  loadingProps?: any
) {
  const [, forceRefresh] = useReducer((s) => (s > 100 ? 0 : s + 1), 0);

  const slicerFunc = useMemo(
    () => (funcOrArr instanceof Function ? funcOrArr : (ctx: StateListenerContext<S, DS, A>) => pick(ctx, funcOrArr)),
    [funcOrArr]
  );

  const loadingMapSlicer = useMemo(() => {
    return (ctx: StateListenerContext<S, DS, A>) =>
      loadingProps != null && loadingProps.length > 0 ? pick(ctx.loadingMap, loadingProps) : null;
  }, [loadingProps]);

  const sliceRef = useRef<any>(null);
  const loadingMapRef = useRef<LoadingMap<A>>(null);

  if (sliceRef.current === null) {
    const ctx = {
      ...store.state,
      ...store.actions,
      ...pick(store, ['actions', 'loading', 'isLoading', 'abortAction', 'loadingMap', 'errorMap']),
    };
    sliceRef.current = slicerFunc(ctx);
    loadingMapRef.current = loadingMapSlicer(ctx);
  }

  useLayoutEffect(() => {
    const unregister = store.addStateListener((ctx) => {
      let hasChanged = false;

      const slice = slicerFunc(ctx);
      const loadingSlice = loadingMapSlicer(ctx);
      const prevSlice = sliceRef.current;
      const compare = globalConfig.comparator;

      hasChanged = prevSlice == null || !compare(slice, prevSlice) || !compare(loadingSlice, loadingMapRef.current);

      sliceRef.current = slice;
      loadingMapRef.current = loadingSlice;

      if (hasChanged) {
        forceRefresh();
      }
    });

    return unregister;
  }, []);

  const slice = sliceRef.current;
  const loadingSlice = loadingMapRef.current;

  return loadingSlice == null ? slice : { ...slice, loadingMap: loadingSlice };
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
 * @param loadingFlags list of action names to extract their loading state from store (available in loadingMap).
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
  properties: K[],
  loadingProps?: KL[]
): Pick<StateListenerContext<S, DS, A>, K> & { loadingMap: LoadingMap<Pick<A, KL>> };

export function useStoreContextSlice<S, A extends DecoratedActions, P, DS>(
  storeContext: Context<StoreApi<S, A, P, DS>>,
  funcOrArr: any,
  loadingProps?: any
) {
  const store = useContext(storeContext);
  return useStoreSlice(store, funcOrArr, loadingProps);
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
export function useStore<S, A extends DecoratedActions, P, DS = {}>(
  store: StoreApi<S, A, P, DS>,
  props: P = null,
  refreshOnUpdate: boolean = true
) {
  const [, forceRefresh] = useReducer((s) => (s > 100 ? 0 : s + 1), 0);

  const storeRef = useRef(store);

  store.setProps(props);

  useLayoutEffect(() => {
    if (refreshOnUpdate) {
      storeRef.current.addStateListener(() => {
        forceRefresh();
      });
    }
  }, [refreshOnUpdate]);

  return store;
}

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
export function useLocalStoreV6<S, A extends DecoratedActions, P, DS = {}>(
  getInitialState: (p: P) => S,
  actionImpl: StoreActions<S, A, P, DS>,
  props?: P,
  options?: StoreOptions<S, A, P, DS>,
  middlewares?: MiddlewareFactory<S, A, P>[],
  refreshOnUpdate: boolean = true
) {
  return useLocalStore({ getInitialState, actions: actionImpl, ...options, middlewares }, props, refreshOnUpdate);
}

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

  return useStore(storeRef.current, props, refreshOnUpdate);
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
