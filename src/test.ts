import { StoreActions, StoreApi, StoreOptions } from '.';
import {
  computeAsyncActionInput,
  computeDerivedValues,
  createRef,
  decorateSyncAction,
  decorateSimpleSyncAction,
  DerivedState,
  isSyncAction,
  isAsyncAction,
  isSimpleSyncAction,
  SetStateFunc,
  decorateAsyncAction,
  Ref,
  onPropChange,
  buildOnMountInvocationContext,
} from './impl';
import { AsyncAction, DecoratedActions, InternalLoadingMap } from './types';

type MockActions<A, MockAction> = {
  [k in keyof A]: MockAction;
};

type MockResult<S, A extends DecoratedActions, P, DS> = {
  readonly prevState: S & DS;
  readonly state: S & DS;
  readonly props: P;
  readonly actions: MockActions<A, any>;
};

type MockResultWithTest<S, A extends DecoratedActions, P, DS> = MockResult<S, A, P, DS> & {
  /**
   * Execute function passed as parameter to test state/props/actions called.
   */
  test: (f: (res: MockResult<S, A, P, DS>) => void) => void;
};

type MockStoreAction<S, A extends DecoratedActions, F extends (...args: any[]) => any, P, DS> = {
  /**
   * Creates a new store action with specified state.
   */
  setState: (state: S) => MockStoreAction<S, A, F, P, DS>;

  /**
   * Creates a new store action with specified props.
   */
  setProps: (props: P) => MockStoreAction<S, A, F, P, DS>;

  /**
   * Creates a new store action using store state overriden by specified state.
   */
  setPartialState: (state: Partial<S>) => MockStoreAction<S, A, F, P, DS>;

  /**
   * Creates a new store action using store props overriden by specified props.
   */
  setPartialProps: (props: Partial<P>) => MockStoreAction<S, A, F, P, DS>;

  /**
   * If action is asynchronous, mock the getPromise call to be resolved with specified object.
   */
  promiseResolves: (res: any /*PromiseResult<F>*/) => MockStoreAction<S, A, F, P, DS>;

  /**
   * If action is asynchronous, mock the getPromise call to be rejected with specified error.
   */
  promiseRejects: (err: Error) => MockStoreAction<S, A, F, P, DS>;

  /**
   * Executes passed function to test state and/or props
   */
  test: (f: (state: S & DS, props: P) => void) => MockStoreAction<S, A, F, P, DS>;

  /**
   * Calls the action with specified parameters.
   * @returns a promise with state/props/actions to assert
   */
  call: (...args: Parameters<F>) => Promise<MockResult<S, A, P, DS>>;
};

type MockStore<S, A extends DecoratedActions, P, DS> = {
  /**
   * Creates a new store with specified state.
   */
  setState: (state: S) => MockStore<S, A, P, DS>;

  /**
   * Creates a new store with specified props.
   */
  setProps: (props: P) => MockStore<S, A, P, DS>;

  /**
   * Creates a new store using store state overriden by specified state.
   */
  setPartialState: (state: Partial<S>) => MockStore<S, A, P, DS>;

  /**
   * Creates a new store using store props overriden by specified props.
   */
  setPartialProps: (props: Partial<P>) => MockStore<S, A, P, DS>;

  /**
   * Executes passed function to test state and/or props
   */
  test: (f: (state: S & DS, props: P) => void) => MockStore<S, A, P, DS>;

  /**
   * Test options.onMount
   * @deprecated Use init() instead
   */
  onMount: (props: Partial<P>) => MockResultWithTest<S, A, P, DS>;

  /**
   * Test state and side effect actions after inbound props have changed.
   */
  onPropsChange: (props: Partial<P>, init?: boolean) => MockResultWithTest<S, A, P, DS>;

  /**
   * Test store at initialization time:
   * - options.onPropsChange with onMount set to true
   * - options.onMount
   */
  init: (props?: Partial<P>) => MockResultWithTest<S, A, P, DS>;

  /** @internal */
  onPropsChangeImpl: (
    newStateRef: Ref<S>,
    newPropsRef: Ref<P>,
    newDerivedStateRef: Ref<DerivedState<DS>>,
    newActionsRef: Ref<StoreActions<S, A, P, DS, S>>,
    setState: SetStateFunc<S, A, P>,
    init?: boolean
  ) => MockResult<S, A, P, DS>;
  getAction: <K extends keyof A>(name: K) => MockStoreAction<S, A, A[K], P, DS>;
};

export function createMockFromStore<S, A extends DecoratedActions, P, DS>(
  store: StoreApi<S, A, P, DS>,
  props: P = {} as P
): MockStore<S, A, P, DS> {
  const cfg = store.getConfig();
  return createMockStore(cfg.getInitialState, cfg.actions, props, cfg.options);
}

export function createMockStore<S, A extends DecoratedActions, P = {}, DS = {}>(
  initialState: S | ((p: P) => S),
  actions: StoreActions<S, A, P, DS>,
  props: P = {} as P,
  options: StoreOptions<S, A, P, DS> = {}
): MockStore<S, A, P, DS> {
  const stateRef = createRef<S>();
  const propsRef = createRef<P>(props);

  if (typeof initialState === 'function') {
    stateRef.current = (initialState as (props: P) => S)(props);
  } else {
    stateRef.current = initialState;
  }

  function cloneStore(newState: S, newProps: P) {
    return createMockStore(newState ?? stateRef.current, actions, newProps ?? propsRef.current, options);
  }

  function getState(newStateRef: Ref<S> = undefined, newPropsRef: Ref<P> = undefined) {
    const derivedStateRef = createRef<DerivedState<DS>>({ state: null, deps: {} });
    computeDerivedValues(newStateRef || stateRef, newPropsRef || propsRef, derivedStateRef, options);
    return {
      ...(newStateRef?.current || stateRef.current),
      ...(derivedStateRef.current.state || ({} as DS)),
    };
  }

  return {
    test(f) {
      f(getState(), propsRef.current);
      return this;
    },
    onMount(propsIn = {} as P) {
      return this.init(propsIn);
    },
    setState(s) {
      return cloneStore(s, undefined) as MockStore<S, A, P, DS>;
    },
    setProps(p) {
      return cloneStore(undefined, p) as MockStore<S, A, P, DS>;
    },
    setPartialState(s) {
      return cloneStore({ ...stateRef.current, ...s }, undefined) as MockStore<S, A, P, DS>;
    },
    setPartialProps(p) {
      return cloneStore(undefined, { ...propsRef.current, ...p }) as MockStore<S, A, P, DS>;
    },
    onPropsChange(newProps: Partial<P>, init = false) {
      const newStateRef = createRef(stateRef.current);
      const newPropsRef = createRef({ ...propsRef.current, ...newProps });
      const derivedStateRef = createRef<DerivedState<DS>>({ state: null, deps: {} });
      const actionsRef = getActionsRef(actions);
      const setState: SetStateFunc<S, A, P> = (newStateIn, newLoadingMap, actionName, actionType, isAsync) => {
        if (newStateIn != null) {
          newStateRef.current = newStateIn;
        }
      };

      const res = this.onPropsChangeImpl(newStateRef, newPropsRef, derivedStateRef, actionsRef, setState, init);

      return {
        ...res,
        test(testFunc) {
          testFunc(res);
        },
      };
    },
    onPropsChangeImpl(
      newStateRef: Ref<S>,
      newPropsRef: Ref<P>,
      newDerivedStateRef: Ref<DerivedState<DS>>,
      actionsRef: Ref<StoreActions<S, A, P, DS, S>>,
      setState: SetStateFunc<S, A, P>,
      init?: boolean
    ) {
      computeDerivedValues(stateRef, propsRef, newDerivedStateRef, options);

      onPropChange(
        newStateRef,
        newDerivedStateRef,
        newPropsRef,
        propsRef.current,
        actionsRef as any,
        options,
        setState,
        init
      );

      return {
        prevState: getState(stateRef, propsRef),
        state: getState(newStateRef, newPropsRef),
        props: newPropsRef.current,
        actions: actionsRef.current,
      };
    },

    init(newProps: Partial<P> = {}) {
      // reset initial state
      const state = typeof initialState === 'function' ? (initialState as (props: P) => S)(props) : initialState;

      const newStateRef = createRef(state);
      const newPropsRef = createRef({ ...propsRef.current, ...newProps });
      const derivedStateRef = createRef<DerivedState<DS>>({ state: null, deps: {} });
      const actionsRef = getActionsRef(actions);

      const setState: SetStateFunc<S, A, P> = (newStateIn, newLoadingMap, actionName, actionType, isAsync) => {
        if (newStateIn != null) {
          newStateRef.current = newStateIn;
        }
      };

      this.onPropsChangeImpl(newStateRef, newPropsRef, derivedStateRef, actionsRef, setState, true);

      if (options?.onMount) {
        options.onMount(buildOnMountInvocationContext(newStateRef, derivedStateRef, newPropsRef, actionsRef as any));
      }

      const res: MockResult<S, A, P, DS> = {
        prevState: null,
        state: getState(newStateRef, newPropsRef),
        props: newPropsRef.current,
        actions: actionsRef.current,
      };

      return {
        ...res,
        test(testFunc) {
          testFunc(res);
        },
      };
    },

    getAction(actionName) {
      return createMockStoreAction(stateRef.current, actionName, actions, propsRef.current, null, options);
    },
  };
}

function getActionsRef<A>(actions: A): Ref<A> {
  const keys = Object.keys(actions) as (keyof A)[];

  return createRef<A>(
    keys.reduce<A>((acc, actionName) => {
      acc[actionName] = mockFactory() as any;
      return acc;
    }, {} as A)
  );
}

function createMockAction(impl?: (...args: any[]) => any): typeof jest.fn {
  return jest.fn(impl);
}

let mockFactory = createMockAction;

/**
 * Set the mock factory. Each mock action will be created using this factory.
 * @param factory the mock factory
 */
export function setMockFactory(factory: (impl?: (...args: any[]) => any) => any) {
  mockFactory = factory;
}

export class ActionError<S = any, P = any, A = any> extends Error {
  public sourceError: Error;
  public prevState: S;
  public state: S;
  public props: P;
  public actions: MockActions<A, any>;

  constructor(sourceError: Error, prevState: S, state: S, props: P, actions: MockActions<A, any>) {
    super(sourceError.message);

    Object.setPrototypeOf(this, ActionError.prototype);

    this.sourceError = sourceError;
    this.prevState = prevState;
    this.props = props;
    this.state = state;
    this.actions = actions;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ActionError);
    }
  }
}

export function createMockStoreAction<S, A extends DecoratedActions, F extends (...args: any[]) => any, P, DS>(
  state: S,
  actionName: keyof A,
  actions: StoreActions<S, A, P, DS, S>,
  props: P,
  promiseRes: Promise<F> | Error,
  options: StoreOptions<S, A, P, DS>
): MockStoreAction<S, A, F, P, DS> {
  const stateRef = createRef<S>(state);
  const propsRef = createRef<P>(props);
  const promiseResult = promiseRes;

  function cloneStoreAction(newState: S, newProps: P, promiseRes: Promise<F> | Error) {
    return createMockStoreAction(
      newState ?? stateRef.current,
      actionName,
      actions,
      newProps ?? propsRef.current,
      promiseRes ?? promiseResult,
      options
    );
  }

  function getState(newStateRef: Ref<S> = undefined, newPropsRef: Ref<P> = undefined) {
    const derivedStateRef = createRef<DerivedState<DS>>({ state: null, deps: {} });
    computeDerivedValues(newStateRef ?? stateRef, newPropsRef ?? propsRef, derivedStateRef, options);
    return {
      ...(newStateRef?.current || stateRef.current),
      ...(derivedStateRef.current.state || ({} as DS)),
    };
  }

  return {
    setState(s) {
      return cloneStoreAction(s, undefined, undefined) as MockStoreAction<S, A, F, P, DS>;
    },
    setProps(p) {
      return cloneStoreAction(undefined, p, undefined) as MockStoreAction<S, A, F, P, DS>;
    },
    setPartialState(s) {
      return cloneStoreAction({ ...stateRef.current, ...s }, undefined, undefined) as MockStoreAction<S, A, F, P, DS>;
    },
    setPartialProps(p) {
      return cloneStoreAction(undefined, { ...propsRef.current, ...p }, undefined) as MockStoreAction<S, A, F, P, DS>;
    },
    promiseResolves(res) {
      return cloneStoreAction(undefined, undefined, Promise.resolve(res)) as MockStoreAction<S, A, F, P, DS>;
    },
    promiseRejects(err) {
      return cloneStoreAction(undefined, undefined, Promise.reject(err)) as MockStoreAction<S, A, F, P, DS>;
    },
    test(f) {
      f(getState(), propsRef.current);
      return this;
    },
    call(...args) {
      const newStateRef = createRef<S>({ ...stateRef.current });
      const derivedStateRef = createRef<DerivedState<DS>>({ state: null, deps: {} });
      computeDerivedValues(newStateRef, propsRef, derivedStateRef, options);

      // create mock action to test side effects
      const actionsRef = getActionsRef(actions);
      const loadingMapRef = createRef<InternalLoadingMap<A>>({});

      const setState: SetStateFunc<S, A, P> = (newStateIn, newLoadingMap, actionName, actionType, isAsync, ctx) => {
        if (newStateIn != null) {
          newStateRef.current = newStateIn;
        }
      };

      const action = actions[actionName];

      let promise = null;

      if (isSimpleSyncAction(action as any)) {
        decorateSimpleSyncAction(
          actionName,
          action as any,
          newStateRef,
          derivedStateRef,
          propsRef,
          createRef(true),
          setState
        )(...((args as any) as Parameters<A[keyof A]>));

        promise = Promise.resolve();
      } else if (isSyncAction(action)) {
        decorateSyncAction(
          actionName,
          // force no debouncing to trigger side effects directly
          { ...action, debounceSideEffectsTimeout: 0, debounceTimeout: 0 },
          newStateRef,
          derivedStateRef,
          propsRef,
          actionsRef as any,
          createRef(true),
          null,
          options,
          setState
        )(...((args as any) as Parameters<A[keyof A]>));

        promise = Promise.resolve();
      } else if (isAsyncAction(action)) {
        const promisesRef = createRef({});
        const conflictActionsRef = createRef({});
        const initializedRef = createRef(true);

        const impl: AsyncAction<S, A[keyof A], A, P, DS> = { ...computeAsyncActionInput(action) };

        if (promiseResult) {
          impl.getPromise = () => promiseResult as any;
        }

        // simulate optimistic actions
        if (impl.optimisticEffects) {
          impl.effects = impl.optimisticEffects;
          delete impl.optimisticEffects;
        }

        promise = (decorateAsyncAction({
          actionName,
          derivedStateRef,
          propsRef,
          loadingMapRef,
          promisesRef,
          conflictActionsRef,
          initializedRef,
          options,
          setState,
          stateRef: newStateRef,
          actionsRef: actionsRef as any,
          action: impl,
        }) as any)(...((args as any) as Parameters<A[keyof A]>));
      }

      return (promise ?? Promise.resolve())
        .then(() => {
          loadingMapRef.current = {};
          return {
            prevState: getState(stateRef),
            state: getState(newStateRef),
            props: propsRef.current,
            actions: (actionsRef.current as any) as MockActions<A, any>,
          };
        })
        .catch((e: Error) => {
          return Promise.reject(
            new ActionError(
              e,
              getState(stateRef),
              getState(newStateRef),
              propsRef.current,
              (actionsRef.current as any) as MockActions<A, any>
            )
          );
        });
    },
  };
}
