/*
 * Copyright 2019 Globalsport SAS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
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
  ComparatorFunction,
  computeDerivedValues,
  DerivedState,
  onPropChange,
  runMiddlewares,
  buildLoadingMap,
  isLoadingImpl,
} from './impl';

import {
  DecoratedActions,
  StoreActions,
  AsyncAction,
  SyncAction,
  SimpleSyncAction,
  InternalLoadingMap,
  LoadingMap,
  LoadingParallelMap,
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
} from './types';

export {
  DecoratedActions,
  StoreActions,
  InternalLoadingMap as LoadingMap,
  StoreOptions,
  LoadingParallelMap,
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
  AbortActionCallback,
};

export type IsLoadingFunc<A> = (...props: (keyof A | [keyof A, string])[]) => boolean;
type StateListenerUnregister = () => void;

export type StoreApi<S, A, P, DS = {}> = {
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
   * A map of parallel loading actions map (computed on property access)
   */
  readonly loadingParallelMap: LoadingParallelMap<A>;
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
};

export type StateListenerContext<S, DS, A> = Pick<
  StoreApi<S, A, any, DS>,
  'state' | 'actions' | 'loading' | 'isLoading' | 'abortAction'
> & {
  s: S & DS;
  a: A;
};
export type StateListener<S, DS, A> = (ctx: StateListenerContext<S, DS, A>) => void;

// =============================
//
// STORE
//
// =============================

/**
 * Create a new store.
 * @param getInitialState The state initialization function (using props)
 * @param actionsImpl  The actions implementation (pure functions only).
 * @param options Options to configure the store
 * @returns a store.
 */
export function createStore<S, A extends DecoratedActions, P, DS = {}>(
  getInitialState: (p: P) => S,
  actionsImpl: StoreActions<S, A, P>,
  options: StoreOptions<S, A, P, DS> = {},
  storeMiddlewares: MiddlewareFactory<S, A, P>[] = null
): StoreApi<S, A, P, DS> {
  const stateRef = createRef<S>();
  const derivedStateRef = createRef<DerivedState<DS>>();
  const propsRef = createRef<P>();
  const actionsRef = createRef<A>();
  const timeoutRef = createRef<TimeoutMap<A>>();
  const loadingMapRef = createRef<InternalLoadingMap<A>>();
  const promisesRef = createRef<PromiseMap<A>>();
  const conflictActionsRef = createRef<ConflictActionsMap<A>>();
  const initializedRef = createRef(false);

  const middlewaresRef = createRef<Middleware<S, A, P>[]>([]);

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
      s,
      isLoading,
      abortAction,
      state: s,
      a: actionsRef.current,
      actions: actionsRef.current,
      loading: isAnyLoading(),
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
      onPropChange(stateRef, propsRef, oldProps, actionsRef, options, setState);
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
      loadingMapRef.current = {};
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
      storeMiddlewares?.forEach(mapper);
      // end init

      if (options?.onMount) {
        options.onMount(buildOnMountInvocationContext(stateRef, propsRef, actionsRef));
      }

      computeDerivedValues(stateRef, propsRef, derivedStateRef, options);

      notifyStateListeners(stateRef.current, derivedStateRef.current.state);
    }
  }

  function destroy() {
    propsRef.current = null;
    stateRef.current = null;
    loadingMapRef.current = null;
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

  function setState(
    newStateIn: S,
    newLoadingMapIn: InternalLoadingMap<A>,
    actionName: keyof A,
    actionType: 'preEffects' | 'effects' | 'errorEffects' | null,
    isAsync: boolean,
    actionCtx: any,
    propsChanged: boolean = false
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

    if (newState != null && newState !== stateRef.current) {
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
      notifyStateListeners(newState || stateRef.current, derivedStateRef.current.state);
    } else if (propsChanged) {
      const derivedChanged = computeDerivedValues(stateRef, propsRef, derivedStateRef, options);
      if (derivedChanged) {
        notifyStateListeners(newState || stateRef.current, derivedStateRef.current.state);
      }
    }
  }

  const keys = Object.keys(actionsImpl) as (keyof A)[];
  actionsRef.current = keys.reduce<A>((acc, actionName) => {
    const action = actionsImpl[actionName];
    if (isSimpleSyncAction(action)) {
      acc[actionName] = decorateSimpleSyncAction(actionName, action, stateRef, propsRef, setState) as any;
    } else if (isAsyncAction(action)) {
      acc[actionName] = decorateAsyncAction({
        actionName,
        stateRef,
        propsRef,
        loadingMapRef,
        actionsRef,
        promisesRef,
        conflictActionsRef,
        initializedRef,
        options,
        setState,
        action: computeAsyncActionInput(action),
      }) as any;
    } else if (isSyncAction(action)) {
      acc[actionName] = decorateSyncAction(
        actionName,
        action,
        stateRef,
        propsRef,
        actionsRef,
        timeoutRef,
        options,
        setState
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
      return Object.keys(loadingMapRef.current).length > 0;
    }
    return null;
  }

  return {
    setProps,
    addStateListener,
    init,
    destroy,
    isLoading,
    abortAction,
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
      if (initializedRef.current) {
        const map = loadingMapRef.current;
        const keys = Object.keys(map) as (keyof A)[];
        return keys.reduce<LoadingMap<A>>((acc, actionName) => {
          acc[actionName] = !!map[actionName];
          return acc;
        }, {});
      }
      return null;
    },
    get loadingParallelMap() {
      if (initializedRef.current) {
        return loadingMapRef.current;
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

type useStoreSlice<S, A, P, DS, SLICE> = (
  store: StoreApi<S, A, P, DS>,
  slicer: (ctx: StateListenerContext<S, DS, A>) => SLICE
) => SLICE;

/**
 * A react hook to get a state slice. Will be refresh if, and only if, one property of the slice has changed
 * @param store The store to listen to.
 * @param slicerFunc A function that returns a state slice
 * @param comparator An optional function to compare if slice property has changed (shallow test by default)
 * @returns The state slice.
 */
export function useStoreSlice<S, A extends DecoratedActions, P, DS, SLICE>(
  store: StoreApi<S, A, P, DS>,
  slicerFunc: (ctx: StateListenerContext<S, DS, A>) => SLICE,
  comparator: ComparatorFunction = null
): SLICE {
  const [, forceRefresh] = useReducer((s) => 1 - s, 0);

  const sliceRef = useRef<SLICE>(null);
  if (sliceRef.current === null) {
    const s = store.state;
    sliceRef.current = slicerFunc({
      s,
      state: s,
      a: store.actions,
      actions: store.actions,
      loading: store.loading,
      isLoading: store.isLoading,
      abortAction: store.abortAction,
    });
  }

  useLayoutEffect(() => {
    const unregister = store.addStateListener((ctx) => {
      let hasChanged = false;

      const slice = slicerFunc(ctx);
      const prevSlice = sliceRef.current;
      const compare = comparator || globalConfig.comparator;

      hasChanged = prevSlice == null || !compare(slice, prevSlice);

      sliceRef.current = slice;

      if (hasChanged) {
        forceRefresh();
      }
    });

    return unregister;
  }, []);

  return sliceRef.current;
}

/**
 * Binds the store to this component.
 * Store will be destroyed when component is unmouted.
 * Props passed to actions will come from this components.
 * If store is configured to react of props changes, it will used passed props.
 * A store must be bound to only one React component.
 * This component will be refreshed for every change in the store.
 *
 * @param store The store to listen to.
 * @param props The parent component props
 * @returns The state, actions and isLoading function.
 */
export function useStore<S, A extends DecoratedActions, P, DS>(store: StoreApi<S, A, P, DS>, props: P = null) {
  // access to store in debugger
  const storeRef = useRef(store);
  storeRef;

  store.setProps(props);
  useEffect(() => {
    return () => store.destroy();
  }, []);
  return {
    ...useStoreSlice(store, (i) => i),
    abortAction: store.abortAction,
  };
}

/**
 * Binds the store to this component.
 * Store will be destroyed when component is unmouted.
 * Props passed to actions will come from this components.
 * If store is configured to react of props changes, it will used passed props.
 * A store must be bound to only one React component.
 *
 * This component will NOT be refreshed for any change in the store.
 *
 * @param store The store to listen to.
 * @param props The parent component props
 */
export function useBindStore<S, A extends DecoratedActions, P, DS>(store: StoreApi<S, A, P, DS>, props: P = null) {
  // access to store in debugger
  const storeRef = useRef(store);
  storeRef;

  store.setProps(props);
  useEffect(() => {
    return () => store.destroy();
  }, []);
  return store;
}

/**
 * Creates and manages a local store.
 * @param getInitialState Function to compute initial state from props.
 * @param actionImpl Actions implementation.
 * @param props Owner component props to update state or react on prop changes
 * @param options The store options.
 * @returns The state, actions and isLoading function.
 */
export function useLocalStore<S, A extends DecoratedActions, P, DS>(
  getInitialState: (p: P) => S,
  actionImpl: StoreActions<S, A, P>,
  props?: P,
  options?: StoreOptions<S, A, P, DS>
) {
  const storeRef = useRef<StoreApi<S, A, P, DS>>();
  if (storeRef.current == null) {
    storeRef.current = createStore(getInitialState, actionImpl, options);
  }

  return useStore(storeRef.current, props);
}

export default useLocalStore;
