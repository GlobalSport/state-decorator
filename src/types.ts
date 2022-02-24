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

export type PromiseResult<Type> = Type extends Promise<infer X> ? X : null;

export type NotifyFunc = (msg: string) => void;

export type PromiseIdMap = { [promiseId: string]: boolean };

export type LoadingMap<A> = { [pId in keyof A]?: boolean };
export type LoadingParallelMap<A> = { [P in keyof A]?: PromiseIdMap };
export type InternalLoadingMap<A> = LoadingParallelMap<A>;

export type LoadingProps<A> = {
  loading: boolean;
  loadingMap: LoadingMap<A>;
  loadingParallelMap: LoadingParallelMap<A>;
};

export type PromiseIdErrorMap = { [promiseId: string]: Error };
export type ErrorMap<A> = { [pId in keyof A]?: Error };
export type ErrorParallelMap<A> = { [P in keyof A]?: PromiseIdErrorMap };

// https://github.com/Microsoft/TypeScript/issues/15300
export interface DecoratedActions {
  [name: string]: (...args: any[]) => Promise<any> | void;
}

/**
 * The State decorator can manage only one asynchronous action of same name at a time.
 * This enum is enumertaing all the policies in such case.
 */
export enum ConflictPolicy {
  /**
   * Reject the promise.
   */
  REJECT = 'reject',

  /**
   * Return a resolved promise with no result.
   */
  IGNORE = 'ignore',

  /**
   * Execute only the last call that conflicts after the one ongoing.
   */
  KEEP_LAST = 'keepLast',

  /**
   * Execute all calls one after another.
   */
  KEEP_ALL = 'keepAll',

  /**
   * Execute all calls one after another.
   * @see getPromiseId
   */
  PARALLEL = 'parallel',

  /**
   * Reuse the ongoing promise if any and if possible (same arguments). Only for GET requests!
   */
  REUSE = 'reuse',
}

export type PromiseProvider<S, DS, F extends (...args: any[]) => any, A, P> = (
  ctx: GetPromiseInvocationContext<S, DS, F, P, A>
) => ReturnType<F> | null;

/**
 * Simple form of a synchronous action.
 */
export type SimpleSyncAction<S, F extends (...args: any[]) => any, P, DS, FxRes = Partial<S>> = (
  ctx: InvocationContext<S, DS, F, P>
) => FxRes | null;

export type SyncAction<S, F extends (...args: any[]) => any, A, P, DS, FxRes = Partial<S>> = {
  /**
   * Function that update the state when the action is called.
   */
  effects?: (ctx: EffectsInvocationContext<S, DS, F, P>) => FxRes | null;

  /**
   * Debounces the action if this parameter is defined.
   */
  debounceTimeout?: number;

  /**
   * Debounces the action side effects if this parameter is defined.
   */
  debounceSideEffectsTimeout?: number;

  /**
   * Function that calls side effects, ie. effects that are not changing the state directly.
   */
  sideEffects?: (ctx: SideEffectsInvocationContext<S, DS, F, P, A>) => void;
};

/**
 * Try to abort an action, if the action is <code>abortable</code>.
 * @param actionName The action name
 * @param promiseId If the action conflict type is <code>ConflictType.PARALLEL</code>, the identifier of the promise.
 * @returns <code>true</code> if the action is abortable and an action is ongoing, <code>false</code> otherwise.
 */
export type AbortActionCallback<A> = (actionName: keyof A, promiseId?: string) => boolean;

export type GetErrorMessage<S, DS, F extends (...args: any[]) => any, P> = (
  ctx: ErrorMessageInvocationContext<S, DS, F, P>
) => string;

export type ContextState<S> = {
  state: S;
  s: S;
};

export type ContextDerivedStateState<DS> = {
  derived: DS;
  ds: DS;
};

export type ContextBase<S, P> = ContextState<S> & {
  props: P;
  p: P;
};

export type ContextWithDerived<S, DS, P> = ContextBase<S, P> & ContextDerivedStateState<DS>;

export type InvocationContextActions<A> = {
  actions: A;
  a: A;
};

export type WarningNotifyFunc = {
  notifyWarning?: NotifyFunc;
};

export type InvocationContext<S, DS, F extends (...args: any[]) => any, P> = ContextWithDerived<S, DS, P> & {
  args: Parameters<F>;
  promiseId: string;
};

export type EffectsInvocationContext<S, DS, F extends (...args: any[]) => any, P> = InvocationContext<S, DS, F, P> & {
  result: PromiseResult<ReturnType<F>>;
  res: PromiseResult<ReturnType<F>>;
};

export type GetPromiseInvocationContext<S, DS, F extends (...args: any[]) => any, P, A> = InvocationContextActions<A> &
  InvocationContext<S, DS, F, P> & {
    abortSignal: AbortSignal;
  };

export type ErrorEffectsInvocationContext<S, DS, F extends (...args: any[]) => any, P> = InvocationContext<
  S,
  DS,
  F,
  P
> & {
  error: Error;
  err: Error;
};

export type SuccessMessageInvocationContext<S, DS, F extends (...args: any[]) => any, P> = EffectsInvocationContext<
  S,
  DS,
  F,
  P
>;
export type ErrorMessageInvocationContext<S, DS, F extends (...args: any[]) => any, P> = ErrorEffectsInvocationContext<
  S,
  DS,
  F,
  P
>;

export type SideEffectsInvocationContext<S, DS, F extends (...args: any[]) => any, P, A> = EffectsInvocationContext<
  S,
  DS,
  F,
  P
> &
  InvocationContextActions<A> &
  WarningNotifyFunc;

export type ErrorSideEffectsInvocationContext<
  S,
  DS,
  F extends (...args: any[]) => any,
  P,
  A
> = ErrorEffectsInvocationContext<S, DS, F, P> & InvocationContextActions<A> & WarningNotifyFunc;

export type OnMountInvocationContext<S, A, P> = ContextBase<S, P> & InvocationContextActions<A>;

export type EffectsType = 'preEffects' | 'effects' | 'errorEffects' | 'optimisticEffects' | null;

export type MiddlewareActionContext<S, A, P> = {
  name: keyof A;
  type: EffectsType;
  isAsync: boolean;
  context: InvocationContext<S, any, any, P>;
};

export type MiddlewareStoreContext<S, A extends DecoratedActions, P> = {
  actions: StoreActions<S, A, P, any, any>;
  state: S;
  setState: (s: S) => void;
  options: StoreOptions<S, A, P, any>;
};

export type MiddlewareFactory<S, A extends DecoratedActions, P> = () => Middleware<S, A, P>;

/**
 * A state change middleware.
 * Allow to listen and change a state change on the fly.
 */
export type Middleware<S, A extends DecoratedActions, P> = {
  /**
   * Initializes the middleware. Called when the store is initializing.
   */
  init: (storeContext: MiddlewareStoreContext<S, A, P>) => void;

  /**
   * Invoked on a state change has occurred and returns a new state or <code>null</code> if unchanged.
   */
  effects: (
    actionContext: MiddlewareActionContext<S, A, P>,
    oldState: S,
    newState: S,
    loading: boolean
  ) => null | {
    state: S;
    loading: boolean;
  };

  /**
   * Destroys the middleware. Called when the store is being destroyed.
   */
  destroy: () => void;
};

export type AsyncActionBase<S, F extends (...args: any[]) => any, A, P, DS, FxRes = Partial<S>> = {
  /**
   * This action can be aborted. An abortSignal will be injected to the <code>promise</code> / <code>promiseGet</code>.
   */
  abortable?: boolean;

  /**
   * A function that provides the success message to pass to the notifySuccess function passed as property to the StateDecorator.
   */
  getSuccessMessage?: (ctx: SuccessMessageInvocationContext<S, DS, F, P>) => string;

  /**
   * A function that provides the error message to pass to the notifyError function passed as property to the StateDecorator.
   */
  getErrorMessage?: GetErrorMessage<S, DS, F, P>;

  /**
   * If set, called with the result of the promise to update the current state.
   */
  effects?: (ctx: EffectsInvocationContext<S, DS, F, P>) => FxRes | null;

  /**
   * If set, called with the error of the promise to update the current state.
   */
  errorEffects?: (ctx: ErrorEffectsInvocationContext<S, DS, F, P>) => FxRes | null;

  /**
   * Whether reject the promise instead of handling it.
   */
  rejectPromiseOnError?: boolean;

  /**
   * When the error will not be managed by an errorEffect, errorSideEffect, getErrorMessage,
   * the state decorator will not display an error message and will not return a failed promise
   * (unless <code>rejectPromiseOnError</code>) is set.
   */
  isErrorManaged?: boolean;

  /**
   * Handle side effects when the request succeeded.
   * @param result The result of the request
   * @param newData The data after the reducer is applied
   * @param args The argument during the call of the request function
   * @param props The props passed to the state decorator
   * @param actions The actions available
   * @param notifyWarning If specified, a notify function to indicate that the action is a semi success (use successMessage / getSuccessMessage otherwise).
   */
  sideEffects?: (ctx: SideEffectsInvocationContext<S, DS, F, P, A>) => void;

  /**
   * Handle side effects when the request failed.
   * @param error The error of the request
   * @param args The argument during the call of the request function
   * @param props The props passed to the state decorator
   * @param actions The actions available
   * @param notifyWarning If specified, a notify function to indicate that the action is a semi failure (use errorMessage / getErrorMessage otherwise).
   */
  errorSideEffects?: (ctx: ErrorSideEffectsInvocationContext<S, DS, F, P, A>) => void;

  /**
   * Retrieve the state to set as current data before the promise is resolved.
   * If the there's no reducer, this data will be used after the promise is done.
   */
  preEffects?: (ctx: InvocationContext<S, DS, F, P>) => FxRes | null;

  /**
   * Retrieve the state to set as current data before the promise is resolved.
   * If the there's no reducer, this data will be used after the promise is done.
   */
  optimisticEffects?: (ctx: InvocationContext<S, DS, F, P>) => FxRes | null;

  /**
   * Policy to apply when a call to an asynchronous action is done but a previous call is still not resolved.
   */
  conflictPolicy?: ConflictPolicy;

  /**
   * Get an identifier for an action call. Used only when conflictPolicy is ConflictPolicy.PARALLEL.
   * This information will be available in loadingMap. loadingMap[actionName] will be an array of promise identifiers.
   */
  getPromiseId?: (...args: Parameters<F>) => string;

  /**
   * Number of retries in case of error (failed to fetch).
   * Do not use this if you are creating objects...
   * Default value is 0 (no retry).
   */
  retryCount?: number;

  /**
   * Seed of delay between each retry in milliseconds.
   * The applied delay is retryDelaySeed * retry count.
   * Default value is 1000 (1 second).
   */
  retryDelaySeed?: number;

  /**
   * Function to test if the error will trigger an action retry or will fail directly.
   */
  isTriggerRetryError?: (e: Error) => boolean;
};

export type AsyncActionPromise<
  S,
  F extends (...args: any[]) => any,
  A,
  P,
  DS = {},
  FxRes = Partial<S>
> = AsyncActionBase<S, F, A, P, DS, FxRes> & {
  /**
   * The request, returns a promise
   */
  getPromise: PromiseProvider<S, DS, F, A, P>;
};

export type AsyncActionPromiseGet<S, F extends (...args: any[]) => any, A, P, DS, FxRes = Partial<S>> = AsyncActionBase<
  S,
  F,
  A,
  P,
  DS,
  FxRes
> & {
  /**
   * The request, returns a promise that is a GET request.
   * A shortcut to set:
   *   - retryCount: 3
   *   - conflictPolicy: ConflictPolicy.REUSE
   */
  getGetPromise: PromiseProvider<S, DS, F, A, P>;
};

export type AsyncAction<S, F extends (...args: any[]) => any, A, P, DS = {}, FxRes = Partial<S>> =
  | AsyncActionPromise<S, F, A, P, DS, FxRes>
  | AsyncActionPromiseGet<S, F, A, P, DS, FxRes>;

export type StoreAction<S, F extends (...args: any[]) => any, A, P, DS = {}, FxRes = Partial<S>> =
  | AsyncAction<S, F, A, P, DS, FxRes>
  | SimpleSyncAction<S, F, P, DS, FxRes>
  | SyncAction<S, F, A, P, DS, FxRes>;

/**
 * S: The type of the state
 * A: The type of the actions to pass to the children (used to check keys only).
 */
export type StoreActions<S, A extends DecoratedActions, P = {}, DS = {}, FxRes = Partial<S>> = {
  [Prop in keyof A]: StoreAction<S, A[Prop], A, P, DS, FxRes>;
};

export type OnPropsChangeEffectsContext<S, DS, P> = ContextWithDerived<S, DS, P> & {
  indices: number[];
  index: number;
  isInit: boolean;
};

export type OnPropsChangeSideEffectsContext<S, P, A, DS = {}> = OnPropsChangeEffectsContext<S, DS, P> & {
  actions: A;
  a: A;
};

type DerivedStateOption<S, P, DS> = {
  [k in keyof DS]: {
    getDeps: (ctx: ContextBase<S, P>) => any[];
    get: (ctx: ContextBase<S, P>) => DS[k];
  };
};

export type OnPropsChangeOptions<S, DS, A, P> = {
  onMount?: boolean;
  getDeps: (p: P) => any[];
  effects?: (ctx: OnPropsChangeEffectsContext<S, DS, P>) => Partial<S>;
  sideEffects?: (ctx: OnPropsChangeSideEffectsContext<S, P, A>) => void;
};

export type StoreOptions<S, A, P = {}, DS = {}> = {
  /**
   * The state decorator name. Use in debug traces to identify the useStateDecorator instance.
   */
  name?: string;

  /**
   * List of action names that are marked as loading at initial time.
   * If you must start your initial actions in a useSideEffect, a render is done before
   * first actions can be trigerred, some actions can be marked as loading at initial time.
   */
  initialActionsMarkedLoading?: (keyof A)[];

  /**
   * One or several configurations of inbound properties change managements.
   */
  onPropsChange?: OnPropsChangeOptions<S, DS, A, P> | OnPropsChangeOptions<S, DS, A, P>[];

  /**
   * The callback function called if an asynchronous function succeeded and a success messsage is defined.
   */
  notifySuccess?: NotifyFunc;

  /**
   * The callback function called if an asynchronous function fails and an error messsage is defined.
   */
  notifyError?: NotifyFunc;

  /**
   * The callback function injected in onDone and onFail of asynchronous functions to notify a semi success / failed request.
   */
  notifyWarning?: NotifyFunc;

  /**
   * Initial actions.
   */
  onMount?: (ctx: OnMountInvocationContext<S, A, P>) => void;

  /**
   * Callback on store destruction.
   */
  onUnmount?: (ctx: OnMountInvocationContext<S, A, P>) => Promise<any> | void;

  /**
   * Compute derived state
   */
  derivedState?: DerivedStateOption<S, P, DS>;
};
