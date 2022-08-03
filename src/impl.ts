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

import shallow from './shallow';
import {
  AsyncAction,
  SimpleSyncAction,
  SyncAction,
  StoreAction,
  AsyncActionPromise,
  ConflictPolicy,
  AsyncActionPromiseGet,
  PromiseProvider,
  GetPromiseInvocationContext,
  DecoratedActions,
  InternalLoadingMap,
  StoreOptions,
  PromiseResult,
  InvocationContext,
  EffectsInvocationContext,
  InvocationContextActions,
  WarningNotifyFunc,
  ErrorEffectsInvocationContext,
  OnMountInvocationContext,
  OnPropsChangeEffectsContext,
  ContextState,
  Middleware,
  MiddlewareFactory,
  OnPropsChangeOptions,
  ContextWithDerived,
  ContextDerivedStateState,
  PromiseIdErrorMap,
  ErrorMap,
  ErrorParallelMap,
  OnUnMountInvocationContext,
  AbortedActions,
  ClearErrorFunc,
  ClearError,
} from './types';

export type SetStateFunc<S, A> = (
  newState: S,
  newLoadingMap: InternalLoadingMap<A>,
  actionName: keyof A | 'onPropsChange',
  actionType: 'preEffects' | 'effects' | 'errorEffects' | null, // FIXME
  isAsync: boolean,
  actionCtx: any,
  propsChanged: boolean,
  isInit?: boolean
) => void;

/** @internal */
export type PromiseMap<A> = {
  [name in keyof A]?: {
    [promiseId: string]: {
      promise: Promise<any>;
      refArgs: any[];
      abortController: AbortController;
    };
  };
};

/** @internal */
export type FutureActions = {
  args: any[];
  resolve: (...args: any[]) => void;
  reject: (...args: any[]) => void;
  timestamp?: number;
};

/** @internal */
export type ConflictActionsMap<A> = {
  [name in keyof A]?: FutureActions[];
};

/** @internal */
export type AsyncActionExecContext<S, DS, F extends (...args: any[]) => any, A extends DecoratedActions, P> = {
  actionName: keyof A;
  action: AsyncActionPromise<S, F, A, P, DS>;
  stateRef: Ref<S>;
  derivedStateRef: Ref<DerivedState<DS>>;
  propsRef: Ref<P>;
  loadingMapRef: Ref<InternalLoadingMap<A>>;
  errorMapRef: Ref<ErrorParallelMap<A>>;
  promisesRef: Ref<PromiseMap<A>>;
  conflictActionsRef: Ref<ConflictActionsMap<A>>;
  actionsRef: Ref<A>;
  initializedRef: Ref<boolean>;
  options: StoreOptions<S, A, P, any>;
  setState: SetStateFunc<S, A>;
  clearError: ClearErrorFunc<A>;
};

/** @internal */
export type TimeoutMap<A> = {
  [name in keyof A]?: any;
};

export type NotifyFunc = (msg: string) => void;
export type CloneFunction = <C>(obj: C) => C;
export type ComparatorFunction = <C>(obj1: C, Obj2: C) => boolean;
export type RetryOnErrorFunction = (error: any) => boolean;
export type AsyncErrorHandler = (
  error: any,
  isHandled: boolean,
  state: any,
  props: any,
  actionName: string,
  args: any[]
) => void;

type DerivedStateMap<DS> = {
  [name in keyof DS]?: any[];
};

/** @internal */
export type DerivedState<DS> = {
  state: DS;
  deps: DerivedStateMap<DS>;
};

// =============================
//
// GLOBAL CONFIG
//
// =============================

/**
 * Global configuration, shared with all stores.
 */
export type GlobalConfig = {
  /**
   * Clone function.
   * Used to clone state and props when managing optimistic reducer and conflicting actions.
   * Default implementation is a very basic algorithm using JSON.stringify. To clone complex stats,
   * use a custom implementation like lodash/cloneDeep.
   * @default JSON.stringify
   */
  clone: CloneFunction;

  /**
   * Compare to objets and returns if they are equal.
   * Used to comparent previous and current state slice.
   * @default shallow
   */
  comparator: ComparatorFunction;

  /**
   * Global callback function to handle asychronous actions rejected promise.
   */
  asyncErrorHandler: AsyncErrorHandler;

  /**
   * Tests if the error will trigger a retry of the action or will fail directly.
   * Default implementation is returning true for TypeError instances only.
   * @see AsynchActionBase#retryCount
   */
  retryOnErrorFunction: RetryOnErrorFunction;

  /**
   * Global notification function that will called when an asynchronous action succeeded,
   * if and only if, an error message is specified for this action using
   * <code>getErrorMessage</code>.
   * If another function is set in the options, the function from the options will be used.
   */
  notifySuccess: NotifyFunc;

  /**
   * Global notification function that will called when an asynchronous action fails,
   * if and only if, an error message is specified for this action using
   * <code>getErrorMessage</code>.
   * If another function is set in the options, the function from the options will be used.
   */
  notifyError: NotifyFunc;

  /**
   * Global notification function that will injected in onDone and onFail of an asynchronous actions and onActionDone of a synchronous function,
   * If another function is set in the options, the function from the options will be used.
   */
  notifyWarning: NotifyFunc;

  /**
   * A default error message provider.
   * Used to return generic messages on generic HTTP errors
   */
  getErrorMessage: (error: Error) => string;

  /**
   * Default middlewares. Store middleware array will be concatenated with this one.
   * By default contains only the optimistic middleware.
   */
  defaultMiddlewares: MiddlewareFactory<any, any, any>[];
};

/** @internal */
export const globalConfig: GlobalConfig = {
  clone: defaultCloneFunc,
  comparator: shallow,
  asyncErrorHandler: () => {},
  retryOnErrorFunction: (error: Error) => error instanceof TypeError,
  notifySuccess: undefined,
  notifyError: undefined,
  notifyWarning: undefined,
  getErrorMessage: undefined,
  defaultMiddlewares: [],
};

export function setGlobalConfig(overrideConfig: Partial<GlobalConfig>) {
  const keys = Object.keys(overrideConfig) as (keyof GlobalConfig)[];
  keys.forEach((k) => {
    if (overrideConfig[k] != null) {
      globalConfig[k] = overrideConfig[k] as any;
    }
  });
}

function defaultCloneFunc(src: any) {
  return JSON.parse(JSON.stringify(src));
}

function clone(obj: any) {
  try {
    return globalConfig.clone(obj);
  } catch (e) {
    const msg =
      'StateDecorator: Cannot clone object. Call setCloneFunction with another implementation like lodash/cloneDeep.';
    if (process.env.NODE_ENV === 'development') {
      console.error(msg);
      console.error(e.toString());
    }
    throw new Error(msg);
  }
}

// ----------------------------
//
// TYPE GUARDS
//
// -----------------------------

/**
 * Type guard function to test if an action is a asynchronous action.
 */
export function isAsyncAction<S, DS, F extends (...args: any[]) => any, A, P, FxRes = S>(
  action: StoreAction<S, F, A, P, DS, FxRes>
): action is AsyncAction<S, F, A, P, DS, FxRes> {
  return (
    !(action instanceof Function) && (action.hasOwnProperty('getPromise') || action.hasOwnProperty('getGetPromise'))
  );
}

/**
 * Type guard function to test if an action is a synchronous action.
 */
export function isSimpleSyncAction<S, F extends (...args: any[]) => any, A, P, DS = {}, FxRes = S>(
  action: StoreAction<S, F, A, P, DS, FxRes>
): action is SimpleSyncAction<S, F, P, DS, FxRes> {
  return typeof action === 'function';
}

/**
 * Type guard function to test if an action is a synchronous action.
 */
export function isSyncAction<S, F extends (...args: any[]) => any, A, P, DS = {}, FxRes = S>(
  action: StoreAction<S, F, A, P, DS, FxRes>
): action is SyncAction<S, F, A, P, DS, FxRes> {
  return (
    typeof action !== 'function' && !action.hasOwnProperty('getPromise') && !action.hasOwnProperty('getGetPromise')
  );
}

export function isAsyncGetPromiseAction<S, DS, F extends (...args: any[]) => any, A, P, FxRes = S>(
  action: StoreAction<S, F, A, P, DS, FxRes>
): action is AsyncActionPromise<S, F, A, P, DS, FxRes> {
  return typeof action !== 'function' && action.hasOwnProperty('getPromise') && !action.hasOwnProperty('getGetPromise');
}

export function isAsyncGetPromiseGetAction<S, DS, F extends (...args: any[]) => any, A, P, FxRes = S>(
  action: StoreAction<S, F, A, P, DS, FxRes>
): action is AsyncActionPromiseGet<S, F, A, P, DS, FxRes> {
  return typeof action !== 'function' && !action.hasOwnProperty('getPromise') && action.hasOwnProperty('getGetPromise');
}

/** @internal */
export function computeAsyncActionInput<S, DS, F extends (...args: any[]) => any, A, P, FxRes = S>(
  action: AsyncAction<S, F, A, P, DS, FxRes>
): AsyncActionPromise<S, F, A, P, DS, FxRes> {
  if (isAsyncGetPromiseGetAction(action)) {
    return {
      ...(action as any),
      getPromise: action.getGetPromise,
      retryCount: 3,
      conflictPolicy: ConflictPolicy.REUSE,
    };
  }
  return action;
}

/** @internal */
export function buildLoadingMap<A>(
  source: InternalLoadingMap<A>,
  actionName: keyof A,
  promiseId: string,
  loading: boolean
): InternalLoadingMap<A> {
  if (loading) {
    return {
      ...source,
      [actionName]: { ...(source[actionName] || {}), [promiseId]: loading },
    };
  }
  const res = {
    ...source,
    [actionName]: { ...source[actionName], [promiseId]: false },
  };
  return res;
}

/** @internal */
export function updateErrorMap<A>(
  source: ErrorParallelMap<A>,
  actionName: keyof A,
  promiseId: string,
  error: Error
): ErrorParallelMap<A> {
  if (error) {
    return {
      ...source,
      [actionName]: { ...(source[actionName] || {}), [promiseId]: error },
    };
  }

  const res: ErrorParallelMap<A> = {
    ...source,
    [actionName]: { ...source[actionName], [promiseId]: undefined },
  };

  return res;
}

export class ParallelActionError extends Error {
  public promiseIds: PromiseIdErrorMap;
  constructor(promiseIds: PromiseIdErrorMap) {
    super('Error');
    this.promiseIds = promiseIds;
    Object.setPrototypeOf(this, ParallelActionError.prototype);
  }
}

export function buildErrorMap<A>(map: ErrorParallelMap<A>) {
  const keys = Object.keys(map) as (keyof A)[];
  return keys.reduce<ErrorMap<A>>((acc, actionName) => {
    const subMap = map[actionName];

    // DEFAULT_PROMISE_ID is set internally
    // if defines it means that action is NOT run in parallel
    if (subMap[DEFAULT_PROMISE_ID] == null) {
      // no error
    } else if (subMap[DEFAULT_PROMISE_ID]) {
      acc[actionName] = subMap[DEFAULT_PROMISE_ID];
    } else {
      const res = Object.keys(subMap).reduce<{ map: PromiseIdErrorMap; hasErr: boolean }>(
        (acc, promiseId) => {
          if (subMap[promiseId] != null) {
            acc.hasErr = true;
            acc.map[promiseId] = subMap[promiseId];
          }
          return acc;
        },
        { hasErr: false, map: {} }
      );

      if (res.hasErr) {
        acc[actionName] = new ParallelActionError(res.map);
      }
    }
    return acc;
  }, {});
}

/** @internal */
export function retryPromiseDecorator<S, DS, F extends (...args: any[]) => Promise<any>, A, P>(
  promiseProvider: PromiseProvider<S, DS, F, A, P>,
  maxCalls = 1,
  delay = 1000,
  isRetryError: (e: Error) => boolean = () => true
): PromiseProvider<S, DS, F, A, P> {
  if (maxCalls === 1) {
    return promiseProvider;
  }
  return (ctx: GetPromiseInvocationContext<S, DS, F, P, A>): ReturnType<F> => {
    async function call(callCount: number, p: Promise<any>): Promise<any> {
      if (p === null) {
        return null;
      }

      return p.catch((e) => {
        if (isRetryError(e)) {
          if (callCount === maxCalls) {
            return Promise.reject(e);
          }
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              const p = promiseProvider(ctx);
              call(callCount + 1, p)
                .then(resolve)
                .catch(reject);
            }, delay * callCount);
          });
        }
        return Promise.reject(e);
      });
    }

    const initialPromise = promiseProvider(ctx);
    if (initialPromise === null) {
      return null;
    }

    return call(1, initialPromise) as ReturnType<F>;
  };
}

export type Ref<P> = {
  current: P;
};

/** @internal */
export function createRef<U>(init: U = null): Ref<U> {
  return {
    current: init,
  };
}

// =============================
//
// ACTION DECORATORS
//
// =============================
/** @internal */
export function buildInvocationContextBase<S, DS, P>(
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>
): ContextWithDerived<S, DS, P> {
  return {
    state: stateRef.current,
    s: stateRef.current,
    ds: derivedStateRef?.current?.state,
    derived: derivedStateRef?.current?.state,
    props: propsRef.current,
    p: propsRef.current,
  };
}

/** @internal */
export function buildOnMountInvocationContext<S, DS, A, P>(
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>,
  actionsRef: Ref<A>
): OnMountInvocationContext<S, A, P> {
  return addContextActions(buildInvocationContextBase(stateRef, derivedStateRef, propsRef), actionsRef);
}

/** @internal */
export function buildOnUnMountInvocationContext<S, DS, A, P>(
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>,
  abortedActions: AbortedActions<A>
): OnUnMountInvocationContext<S, A, P> {
  return { ...buildInvocationContextBase(stateRef, derivedStateRef, propsRef), abortedActions };
}

/** @internal */
export function buildOnPropChangeEffects<S, DS, P>(
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>,
  indices: number[],
  index: number,
  isInit: boolean
): OnPropsChangeEffectsContext<S, DS, P> {
  const res = buildInvocationContextBase(stateRef, derivedStateRef, propsRef) as OnPropsChangeEffectsContext<S, DS, P>;
  res.indices = indices;
  res.index = index;
  res.isInit = isInit;
  return res;
}

/** @internal */
function buildInvocationContext<S, DS, F extends (...args: any[]) => any, P>(
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>,
  args: Parameters<F>,
  promiseId?: string
): InvocationContext<S, DS, F, P> {
  const res = buildInvocationContextBase(stateRef, derivedStateRef, propsRef) as InvocationContext<S, DS, F, P>;
  res.args = args;
  if (promiseId) {
    res.promiseId = promiseId;
  }

  return res;
}

/** @internal */
function buildEffectsInvocationContext<S, DS, F extends (...args: any[]) => any, P>(
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>,
  args: Parameters<F>,
  result: PromiseResult<ReturnType<F>>,
  promiseId?: string
): EffectsInvocationContext<S, DS, F, P> {
  const res = buildInvocationContext(stateRef, derivedStateRef, propsRef, args, promiseId) as EffectsInvocationContext<
    S,
    DS,
    F,
    P
  >;
  res.result = result;
  res.res = result;
  return res;
}

/** @internal */
function buildErrorEffectsInvocationContext<S, DS, F extends (...args: any[]) => any, P>(
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>,
  args: Parameters<F>,
  error: Error,
  promiseId?: string
): ErrorEffectsInvocationContext<S, DS, F, P> {
  const res = buildInvocationContext(
    stateRef,
    derivedStateRef,
    propsRef,
    args,
    promiseId
  ) as ErrorEffectsInvocationContext<S, DS, F, P>;
  res.error = error;
  res.err = error;
  return res;
}

/** @internal */
function buildPromiseActionContext<S, DS, F extends (...args: any[]) => any, P, A>(
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>,
  args: Parameters<F>,
  actionsRef: Ref<A>,
  abortSignal: AbortSignal,
  promiseId?: string
): GetPromiseInvocationContext<S, DS, F, P, A> {
  const res = addContextActions(
    buildInvocationContext(stateRef, derivedStateRef, propsRef, args, promiseId),
    actionsRef
  ) as GetPromiseInvocationContext<S, DS, F, P, A>;
  res.abortSignal = abortSignal;
  return res;
}

/** @internal */
export function addStateToContext<T, S>(ctx: T, stateRef: Ref<S>): T & ContextState<S> {
  const newCtx = ctx as T & ContextState<S>;

  newCtx.state = stateRef.current;
  newCtx.s = stateRef.current;
  return newCtx;
}

/** @internal */
export function addContextActions<T, A>(ctx: T, actionsRef: Ref<A>): T & InvocationContextActions<A> {
  const newCtx = ctx as T & InvocationContextActions<A>;

  newCtx.actions = actionsRef.current;
  newCtx.a = actionsRef.current;
  return newCtx;
}

/** @internal */
function addSideEffectsContext<S, DS, T extends { s: S; state: S }, A>(
  ctx: T,
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  actionsRef: Ref<A>,
  notifyWarning: NotifyFunc,
  clearError: ClearErrorFunc<A>
): T & InvocationContextActions<A> & WarningNotifyFunc & ClearError<A> & ContextDerivedStateState<DS> {
  const res = addContextActions(ctx, actionsRef) as T &
    InvocationContextActions<A> &
    WarningNotifyFunc &
    ClearError<A> &
    ContextDerivedStateState<DS>;
  addStateToContext(ctx, stateRef);
  const ds = derivedStateRef?.current?.state;
  res.derived = ds;
  res.ds = ds;
  res.notifyWarning = notifyWarning;
  res.clearError = clearError;
  return res;
}

function notInitWarning<A>(actionName: keyof A) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[state-decorator] ${actionName} action was called while store is not initialized or destroyed, this is probably a leak`
    );
  }
}

/** @internal */
export function decorateSimpleSyncAction<S, DS, F extends (...args: any[]) => any, A extends DecoratedActions, P>(
  actionName: keyof A,
  action: SimpleSyncAction<S, F, P, DS>,
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>,
  initializedRef: Ref<boolean>,
  setState: SetStateFunc<S, A>
) {
  return (...args: Parameters<F>) => {
    // store was destroyed
    if (!initializedRef.current) {
      notInitWarning(actionName);
      return;
    }

    const ctx = buildInvocationContext(stateRef, derivedStateRef, propsRef, args);
    const newState = action(ctx);
    setState(newState, null, actionName, 'effects', false, ctx, false);
  };
}

/** @internal */
function executeSyncActionImpl<S, DS, F extends (...args: any[]) => any, A extends DecoratedActions, P>(
  actionName: keyof A,
  action: SyncAction<S, F, A, P, DS>,
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>,
  actionsRef: Ref<A>,
  timeoutMap: Ref<TimeoutMap<A>>,
  options: StoreOptions<S, A, P, any>,
  setState: SetStateFunc<S, A>,
  clearError: ClearErrorFunc<A>,
  args: Parameters<F>
) {
  const ctx = buildEffectsInvocationContext(stateRef, derivedStateRef, propsRef, args, undefined);

  let actionDropped = false;
  if (action.effects != null) {
    const newState: S = action.effects(ctx);
    if (newState === null) {
      actionDropped = true;
    } else {
      setState(newState, undefined, actionName, 'effects', false, ctx, false);
    }
  }

  if (!actionDropped) {
    if (action.debounceSideEffectsTimeout > 0) {
      const timeout = timeoutMap.current[actionName];

      if (timeout) {
        clearTimeout(timeout);
      }

      timeoutMap.current[actionName] = setTimeout(() => {
        action.sideEffects?.(
          addSideEffectsContext(ctx, stateRef, derivedStateRef, actionsRef, options.notifyWarning, clearError)
        );
        delete timeoutMap.current[actionName];
      }, action.debounceSideEffectsTimeout);
    } else {
      action.sideEffects?.(
        addSideEffectsContext(ctx, stateRef, derivedStateRef, actionsRef, options.notifyWarning, clearError)
      );
    }
  }
}

/** @internal */
export function decorateSyncAction<S, DS, F extends (...args: any[]) => any, A extends DecoratedActions, P>(
  actionName: keyof A,
  action: SyncAction<S, F, A, P, DS>,
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>,
  actionsRef: Ref<A>,
  initializedRef: Ref<boolean>,
  timeoutMap: Ref<TimeoutMap<A>>,
  options: StoreOptions<S, A, P, any>,
  setState: SetStateFunc<S, A>,
  clearError: ClearErrorFunc<A>
) {
  return (...args: Parameters<F>) => {
    // store was destroyed
    if (!initializedRef.current) {
      notInitWarning(actionName);
      return;
    }

    if (action.debounceTimeout) {
      const timeout = timeoutMap.current[actionName];

      if (timeout) {
        clearTimeout(timeout);
      }

      timeoutMap.current[actionName] = setTimeout(() => {
        delete timeoutMap.current[actionName];
        executeSyncActionImpl(
          actionName,
          action,
          stateRef,
          derivedStateRef,
          propsRef,
          actionsRef,
          timeoutMap,
          options,
          setState,
          clearError,
          args
        );
      }, action.debounceTimeout);
    } else {
      executeSyncActionImpl(
        actionName,
        action,
        stateRef,
        derivedStateRef,
        propsRef,
        actionsRef,
        timeoutMap,
        options,
        setState,
        clearError,
        args
      );
    }
  };
}

function processPromiseSuccess<S, DS, F extends (...args: any[]) => any, A extends DecoratedActions, P>(
  context: AsyncActionExecContext<S, DS, F, A, P>,
  promiseId: string,
  promiseResult: PromiseResult<F>,
  args: Parameters<F>
) {
  const {
    action,
    stateRef,
    derivedStateRef,
    propsRef,
    promisesRef,
    actionsRef,
    loadingMapRef,
    conflictActionsRef,
    actionName,
    options,
    setState,
    clearError,
  } = context;

  // store was destroyed
  if (!context.initializedRef.current) {
    return void 0;
  }

  let newState = null;

  const ctx = buildEffectsInvocationContext(stateRef, derivedStateRef, propsRef, args, promiseResult, promiseId);

  if (action.effects) {
    newState = action.effects(ctx);
  }

  setState(
    newState,
    buildLoadingMap(loadingMapRef.current, actionName, promiseId, false),
    actionName,
    'effects',
    true,
    ctx,
    false
  );

  const notifySuccess = options.notifySuccess || globalConfig.notifySuccess;

  if (notifySuccess) {
    let msg: string;

    if (action.getSuccessMessage) {
      msg = action.getSuccessMessage(ctx);
    }

    if (msg) {
      notifySuccess(msg);
    }
  }

  delete promisesRef.current[actionName][promiseId];

  if (action.sideEffects) {
    action.sideEffects(
      addSideEffectsContext(ctx, stateRef, derivedStateRef, actionsRef, globalConfig.notifyWarning, clearError)
    );
  }

  processNextConflictAction(actionName, actionsRef.current, conflictActionsRef.current);

  return promiseResult;
}

function processPromiseFailed<S, DS, F extends (...args: any[]) => any, A extends DecoratedActions, P>(
  context: AsyncActionExecContext<S, DS, F, A, P>,
  promiseId: string,
  error: Error,
  args: Parameters<F>
) {
  const {
    action,
    stateRef,
    derivedStateRef,
    propsRef,
    actionsRef,
    loadingMapRef,
    errorMapRef,
    promisesRef,
    conflictActionsRef,
    actionName,
    options,
    clearError,
    setState,
  } = context;

  // store was killed;
  if (!context.initializedRef.current) {
    return void 0;
  }

  let newState = null;

  const ctx = buildErrorEffectsInvocationContext(stateRef, derivedStateRef, propsRef, args, error, promiseId);

  if (action.errorEffects) {
    newState = action.errorEffects(ctx);
  }

  // do not trigger a setState by itself because loading state will trigger a set anyway...
  errorMapRef.current = updateErrorMap(errorMapRef.current, actionName, promiseId, error);

  setState(
    newState,
    buildLoadingMap(loadingMapRef.current, actionName, promiseId, false),
    actionName,
    'errorEffects',
    true,
    ctx,
    false
  );

  let errorHandled = false;

  if (newState != null || action.errorSideEffects || action.isErrorManaged || options.isErrorManaged) {
    errorHandled = true;
  }

  const notifyError = options.notifyError || globalConfig.notifyError;

  if (notifyError) {
    let msg: string;

    if (action.getErrorMessage) {
      msg = action.getErrorMessage(ctx);
    }

    // do not trigger a default error message if the error is already managed by error effects
    if (msg === undefined && !errorHandled && globalConfig.getErrorMessage) {
      msg = globalConfig.getErrorMessage(error);
    }

    if (msg) {
      errorHandled = true;
      notifyError(msg);
    }
  }

  globalConfig.asyncErrorHandler(
    error,
    errorHandled || action.rejectPromiseOnError,
    stateRef.current,
    propsRef.current,
    actionName as string,
    args
  );

  delete promisesRef.current[actionName][promiseId];

  if (action.errorSideEffects) {
    action.errorSideEffects(
      addSideEffectsContext(ctx, stateRef, derivedStateRef, actionsRef, globalConfig.notifyWarning, clearError)
    );
  }

  processNextConflictAction(actionName, actionsRef.current, conflictActionsRef.current);

  const result = !errorHandled || action.rejectPromiseOnError ? Promise.reject(error) : Promise.resolve();

  return result;
}

/** @internal */
export function decorateAsyncAction<S, DS, F extends (...args: any[]) => any, A extends DecoratedActions, P>(
  context: AsyncActionExecContext<S, DS, F, A, P>
) {
  const {
    action,
    stateRef,
    derivedStateRef,
    propsRef,
    actionsRef,
    promisesRef,
    loadingMapRef,
    errorMapRef,
    initializedRef,
    conflictActionsRef,
    actionName,
    setState,
  } = context;

  return (...args: Parameters<F>): Promise<any> => {
    if (!initializedRef.current) {
      notInitWarning(actionName);
      return null;
    }

    const promises = promisesRef.current;

    const { conflictPolicy = ConflictPolicy.KEEP_ALL } = action;
    const isParallel = conflictPolicy === ConflictPolicy.PARALLEL;

    let promiseId: string = null;
    if (isParallel) {
      if (!action.getPromiseId) {
        throw new Error(
          'If conflict policy is set to ConflictPolicy.PARALLEL, getPromiseId must be set and return a string.'
        );
      }
      promiseId = action.getPromiseId(...args);
    } else {
      promiseId = DEFAULT_PROMISE_ID;
    }

    if (!isParallel && promises[actionName]?.[promiseId]) {
      return handleConflictingAction(promises, conflictActionsRef.current, actionName, conflictPolicy, args);
    }

    let newState = null;
    let hasChanged = false;

    const ctx = buildInvocationContext(stateRef, derivedStateRef, propsRef, args, promiseId);
    if (action.preEffects) {
      newState = action.preEffects(ctx);

      // apply internal state change for calls to other actions in the getPromise
      if (newState) {
        hasChanged = true;
        stateRef.current = newState;
      }
    }

    const { abortable, retryCount, retryDelaySeed, isTriggerRetryError } = action;

    const abortController = abortable && window.AbortController ? new AbortController() : null;

    const promiseProvider = retryPromiseDecorator(
      action.getPromise,
      retryCount ? 1 + retryCount : 1,
      retryDelaySeed,
      isTriggerRetryError || globalConfig.retryOnErrorFunction
    );

    const p = promiseProvider(
      buildPromiseActionContext(stateRef, derivedStateRef, propsRef, args, actionsRef, abortController?.signal)
    )
      ?.then((promiseResult: PromiseResult<F>) => processPromiseSuccess(context, promiseId, promiseResult, args))
      .catch((error: any) => processPromiseFailed(context, promiseId, error, args));

    if (p != null) {
      promises[actionName] = {
        ...(promises[actionName] || {}),
        [promiseId || DEFAULT_PROMISE_ID]: {
          abortController,
          promise: p,
          refArgs: conflictPolicy === ConflictPolicy.REUSE && args.length > 0 ? [...args] : [],
        },
      };
    }

    errorMapRef.current = updateErrorMap(errorMapRef.current, actionName, promiseId, null);

    setState(
      p == null && !hasChanged ? undefined : stateRef.current,
      p == null ? undefined : buildLoadingMap(loadingMapRef.current, actionName, promiseId, true),
      actionName,
      'preEffects',
      true,
      ctx,
      false
    );

    return p;
  };
}

/** @internal */
export function isLoadingImpl<A, K extends keyof A>(loadingMap: InternalLoadingMap<A>, ...props: (K | [K, string])[]) {
  return props.some((propIn) => {
    let actionName: keyof A = null;
    let promiseId = DEFAULT_PROMISE_ID;

    if (Array.isArray(propIn)) {
      [actionName, promiseId = DEFAULT_PROMISE_ID] = propIn;
    } else {
      actionName = propIn;
    }

    const res = loadingMap[actionName];

    if (res == null) {
      return false;
    }

    if (res[promiseId] != null) {
      return res[promiseId];
    }

    return false;
  });
}

// ------------------------------
//
// Conflict management
//
// ------------------------------

export const DEFAULT_PROMISE_ID = '__def__';

/** @internal */
export function areSameArgs(args1: any[], args2: any[]): boolean {
  if (args1.length !== args2.length) {
    return false;
  }
  return args1.findIndex((value, index) => args2[index] !== value) === -1;
}

/**
 * Handles a conflicting action depending on the action conflict policy.
 */
/** @internal */
function handleConflictingAction<A>(
  promises: PromiseMap<A>,
  conflictActions: ConflictActionsMap<A>,
  actionName: keyof A,
  conflictPolicy: ConflictPolicy,
  args: any[]
) {
  let policy = conflictPolicy;
  if (policy === ConflictPolicy.REUSE) {
    // use default because action cannot be parallel
    if (areSameArgs(promises[actionName][DEFAULT_PROMISE_ID].refArgs, args)) {
      return promises[actionName][DEFAULT_PROMISE_ID].promise;
    } // else
    policy = ConflictPolicy.KEEP_ALL;
  }

  return new Promise((resolve, reject) => {
    const futureAction = {
      resolve,
      reject,
      args: clone(args),
      timestamp: Date.now(),
    };

    switch (policy) {
      case ConflictPolicy.IGNORE:
        resolve(void 0);
        break;
      case ConflictPolicy.REJECT:
        reject(new Error(`An asynchronous action ${actionName} is already ongoing.`));
        break;
      case ConflictPolicy.KEEP_LAST: {
        conflictActions[actionName] = [futureAction];
        break;
      }
      case ConflictPolicy.KEEP_ALL: {
        let stack = conflictActions[actionName];
        if (!stack) {
          conflictActions[actionName] = stack = [];
        }
        stack.push(futureAction);

        break;
      }
      case ConflictPolicy.PARALLEL:
      case ConflictPolicy.REUSE:
        // no-op
        break;
      default:
        // will trigger a compilation error if one of the enum values is not processed.
        const exhaustiveCheck: never = policy;
        exhaustiveCheck;
        break;
    }
  });
}

/**
 * Processes next conflicting action (see ConflictPolicy) in the queue.
 */
function processNextConflictAction<A>(actionName: keyof A, actions: A, conflictActions: ConflictActionsMap<A>) {
  const futureActions = conflictActions[actionName];

  if (futureActions && futureActions.length > 0) {
    const futureAction = conflictActions[actionName].shift();

    if (futureAction) {
      const p = (actions[actionName] as any)(...futureAction.args) as Promise<any>;
      if (p == null) {
        processNextConflictAction(actionName, actions, conflictActions);
      } else {
        p.then((res) => {
          if (res === null) {
            // promise was aborted
            processNextConflictAction(actionName, actions, conflictActions);
          }
          futureAction.resolve(res);
        }).catch((e) => futureAction.reject(e));
      } // else aborted
    }
  }
}

/** @internal */
export function computeDerivedValues<S, A, P, DS>(
  s: Ref<S>,
  p: Ref<P>,
  derivedStateRef: Ref<DerivedState<DS>>,
  options: StoreOptions<S, A, P, DS>
): boolean {
  if (options?.derivedState == null) {
    return false;
  }

  let hasChanged = false;
  const compare = globalConfig.comparator;

  const depsMap = derivedStateRef.current.deps;
  const ctx = buildInvocationContextBase(s, null, p);

  const keys = Object.keys(options.derivedState) as (keyof DS)[];

  derivedStateRef.current.state = keys.reduce((acc, propName) => {
    let compute = false;

    const previousDeps = depsMap[propName];
    const deps = options.derivedState[propName].getDeps(ctx);
    if (previousDeps == null) {
      compute = true;
    } else {
      compute =
        deps.find((dep, index) => (previousDeps.length < index ? true : !compare(previousDeps[index], dep))) != null;
    }

    hasChanged = hasChanged || compute;

    // update cache of previous deps
    depsMap[propName] = deps;

    if (compute) {
      acc[propName] = options.derivedState[propName].get(ctx);
    } else {
      acc[propName] = derivedStateRef.current.state[propName];
    }

    return acc;
  }, {} as DS);

  return hasChanged;
}

// --------------------------------------
//
// Props change
//
// --------------------------------------

/** @internal */
export function onPropChange<S, P, A, DS>(
  stateRef: Ref<S>,
  derivedStateRef: Ref<DerivedState<DS>>,
  propsRef: Ref<P>,
  oldProps: P,
  actionsRef: Ref<A>,
  options: StoreOptions<S, A, P, DS>,
  setState: SetStateFunc<S, A>,
  isInit: boolean
) {
  const hasDerivedState = options?.derivedState != null;

  if (options.onPropsChange == null) {
    if (options?.derivedState != null) {
      //    derived values must be updated from props
      setState(undefined, undefined, 'onPropsChange', 'effects', false, null, true);
    }
    return;
  }

  let onPropsChanges: OnPropsChangeOptions<S, DS, A, P>[];

  if (Array.isArray(options.onPropsChange)) {
    onPropsChanges = options.onPropsChange;
  } else {
    onPropsChanges = [options.onPropsChange];
  }

  let stateChanged = false;

  const newStateRef = createRef(stateRef.current);
  const sideEffects: { index: number; indices: any[]; ctx: OnPropsChangeEffectsContext<S, DS, P> }[] = [];

  const compare = globalConfig.comparator;

  onPropsChanges.forEach((propsChange, index) => {
    const getDeps = propsChange.getDeps;
    if (getDeps) {
      let propChanged = false;

      const indices: number[] = [];

      if (isInit) {
        if (propsChange.onMount) {
          propChanged = true;
        } else {
          // skip this onPropsChange
          return;
        }
      } else {
        const oldValues = getDeps(oldProps);
        const newValues = getDeps(propsRef.current);

        if (oldValues.length !== newValues.length) {
          console.warn('options.onPropsChange.getDeps returned array must be stable (same length)');
          propChanged = true;
        } else {
          oldValues.forEach((v, i) => {
            if (!compare(v, newValues[i])) {
              propChanged = true;
              indices.push(i);
            }
          });
        }
      }

      if (propChanged) {
        const ctx = buildOnPropChangeEffects(newStateRef, derivedStateRef, propsRef, indices, index, isInit);
        const newState = propsChange.effects?.(ctx) ?? null;

        if (newState != null) {
          stateChanged = true;
          newStateRef.current = newState;
          setState(newStateRef.current, undefined, 'onPropsChange', 'effects', false, ctx, true, isInit);
        }

        if (propsChange.sideEffects) {
          sideEffects.push({ index, indices, ctx });
        }
      }
    }
  });

  if (!stateChanged && hasDerivedState) {
    //    derived values must be updated from props
    setState(undefined, undefined, 'onPropsChange', 'effects', false, null, true);
  }

  if (sideEffects.length > 0) {
    sideEffects.forEach((sideEffectInfo) => {
      const onPropChange = onPropsChanges[sideEffectInfo.index];
      onPropChange.sideEffects({
        ...addStateToContext(addContextActions(sideEffectInfo.ctx, actionsRef), newStateRef),
        indices: sideEffectInfo.indices,
      });
    });
  }
}

// ------------------
//
// Middlewares
//
// ------------------

/** @internal */
export function runMiddlewares<S, A extends DecoratedActions, P>(
  middlewares: Middleware<S, A, P>[],
  oldState: S,
  newState: S,
  loading: boolean,
  actionName: keyof A,
  actionType: 'preEffects' | 'effects' | 'errorEffects' | null,
  isAsync: boolean,
  actionCtx: any
): {
  newState: S;
  newLoading: boolean;
} {
  // onPropChange to compute derived state but not state change
  if (actionName === 'onPropsChange' && newState === undefined) {
    return {
      newState: null,
      newLoading: false,
    };
  }

  if (middlewares && middlewares.length > 0) {
    const res = middlewares.reduce(
      (acc, middleware) => {
        const res = middleware.effects(
          {
            isAsync,
            name: actionName,
            type: actionType,
            context: actionCtx,
          },
          acc.oldState,
          acc.newState,
          loading
        );

        return {
          newState: res?.state || acc.newState,
          oldState: res?.state ? acc.newState : acc.oldState,
          loading: res?.loading == null ? acc.loading : res.loading,
        };
      },
      {
        oldState,
        newState,
        loading,
      }
    );

    return {
      newLoading: res.loading,
      newState: res.newState,
    };
  }
  return {
    newState,
    newLoading: loading,
  };
}
