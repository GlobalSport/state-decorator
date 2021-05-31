import { StoreActions, StoreOptions } from '.';
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
} from './impl';
import { AsyncAction, DecoratedActions, InternalLoadingMap } from './types';

type MockActions<A, MockAction> = {
  [k in keyof A]: MockAction;
};

type MockResult<S, A extends DecoratedActions, P, DS> = {
  readonly state: S & DS;
  readonly props: P;
  readonly actions: MockActions<A, any>;
};

type MockResultWithTest<S, A extends DecoratedActions, P, DS> = MockResult<S, A, P, DS> & {
  test: (f: (res: MockResult<S, A, P, DS>) => void) => void;
};

type MockStoreAction<S, A extends DecoratedActions, F extends (...args: any[]) => any, P, DS> = {
  setState: (state: S) => MockStoreAction<S, A, F, P, DS>;
  setProps: (props: P) => MockStoreAction<S, A, F, P, DS>;
  setPartialState: (state: Partial<S>) => MockStoreAction<S, A, F, P, DS>;
  setPartialProps: (props: Partial<P>) => MockStoreAction<S, A, F, P, DS>;

  promiseResolves: (res: any /*PromiseResult<F>*/) => MockStoreAction<S, A, F, P, DS>;
  promiseRejects: (err: Error) => MockStoreAction<S, A, F, P, DS>;

  test: (f: (state: S & DS, props: P) => void) => MockStoreAction<S, A, F, P, DS>;

  call: (...args: Parameters<F>) => Promise<MockResult<S, A, P, DS>>;
};

type MockStore<S, A extends DecoratedActions, P, DS> = {
  setState: (state: S) => MockStore<S, A, P, DS>;
  setProps: (props: P) => MockStore<S, A, P, DS>;
  setPartialState: (state: Partial<S>) => MockStore<S, A, P, DS>;
  setPartialProps: (props: Partial<P>) => MockStore<S, A, P, DS>;

  test: (f: (state: S & DS, props: P) => void) => MockStore<S, A, P, DS>;
  onMount: (props: P, testFunction: (props: P, actions: MockActions<A, any>) => void) => MockStore<S, A, P, DS>;

  onPropsChange: (props: P) => MockResultWithTest<S, A, P, DS>;

  getAction: <K extends keyof A>(name: K) => MockStoreAction<S, A, A[K], P, DS>;
};

export function createMockStore<S, A extends DecoratedActions, P = {}, DS = {}>(
  initialState: S | ((p: P) => S),
  actions: StoreActions<S, A, P>,
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
    onMount(propsIn, f) {
      const actionsRef = getActionsRef(actions);

      if (options?.onMount == null) {
        throw new Error("There's no onMount set on store options");
      }

      const p = propsIn || props;
      const a = actionsRef.current as any;
      const s = stateRef.current;

      options.onMount({
        s,
        p,
        a,
        state: s,
        props: p,
        actions: a,
      });

      f(p, a);

      return this;
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
    onPropsChange(newProps) {
      const newStateRef = createRef(stateRef.current);
      const newPropsRef = createRef(newProps);
      const derivedStateRef = createRef<DerivedState<DS>>({ state: null, deps: {} });
      computeDerivedValues(newStateRef, newPropsRef, derivedStateRef, options);

      const setState: SetStateFunc<S, A, P> = (newStateIn, newLoadingMap, actionName, actionType, isAsync) => {
        if (newStateIn != null) {
          newStateRef.current = newStateIn;
        }
      };

      const actionsRef = getActionsRef(actions);

      onPropChange(newStateRef, derivedStateRef, newPropsRef, propsRef.current, actionsRef as any, options, setState);

      const res = {
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

  function getState(newStateRef: Ref<S> = undefined) {
    const derivedStateRef = createRef<DerivedState<DS>>({ state: null, deps: {} });
    computeDerivedValues(newStateRef || stateRef, propsRef, derivedStateRef, options);
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
          { ...action, debounceSideEffectsTimeout: 0 },
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
      }
      if (isAsyncAction(action)) {
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

      return (promise || Promise.resolve())
        .catch(() => Promise.resolve())
        .then(() => {
          loadingMapRef.current = {};
          return {
            state: getState(newStateRef),
            props: propsRef.current,
            actions: (actionsRef.current as any) as MockActions<A, any>,
          };
        });
    },
  };
}
