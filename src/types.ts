/*
 * Copyright 2019 Globalsport SAS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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

export type PromiseProvider<S, F extends (...args: any[]) => any, A, P> = (
  ctx: GetPromiseInvocationContext<S, F, P, A>
) => ReturnType<F> | null;

/**
 * Simple form of a synchronous action.
 */
export type SimpleSyncAction<S, F extends (...args: any[]) => any, P, FxRes = S> = (
  ctx: InvocationContext<S, F, P>
) => FxRes | null;

export type SyncAction<S, F extends (...args: any[]) => any, A, P, FxRes = S> = {
  /**
   * The action to execute.
   */
  effects?: (ctx: EffectsInvocationContext<S, F, P>) => FxRes | null;

  /**
   * Debounces the action if this parameter is defined.
   */
  debounceSideEffectsTimeout?: number;

  /**
   * Action to call when the action is done. Used to trigger other actions (even asynchronous),
   */
  sideEffects?: (ctx: SideEffectsInvocationContext<S, F, P, A>) => void;
};

/**
 * Try to abort an action, if the action is <code>abortable</code>.
 * @param actionName The action name
 * @param promiseId If the action conflict type is <code>ConflictType.PARALLEL</code>, the identifier of the promise.
 * @returns <code>true</code> if the action is abortable and an action is ongoing, <code>false</code> otherwise.
 */
export type AbortActionCallback<A> = (actionName: keyof A, promiseId?: string) => boolean;

export type GetErrorMessage<S, F extends (...args: any[]) => any, P> = (
  ctx: ErrorMessageInvocationContext<S, F, P>
) => string;

export type ContextState<S> = {
  state: S;
  s: S;
};

export type ContextBase<S, P> = ContextState<S> & {
  state: S;
  s: S;
  props: P;
  p: P;
};

export type InvocationContextActions<A> = {
  actions: A;
  a: A;
};

export type WarningNotifyFunc = {
  notifyWarning?: NotifyFunc;
};

export type InvocationContext<S, F extends (...args: any[]) => any, P> = ContextBase<S, P> & {
  args: Parameters<F>;
  promiseId?: string;
};

export type EffectsInvocationContext<S, F extends (...args: any[]) => any, P> = InvocationContext<S, F, P> & {
  result: PromiseResult<ReturnType<F>>;
  res: PromiseResult<ReturnType<F>>;
};

export type GetPromiseInvocationContext<S, F extends (...args: any[]) => any, P, A> = InvocationContextActions<A> &
  InvocationContext<S, F, P> & {
    abortSignal: AbortSignal;
  };

export type ErrorEffectsInvocationContext<S, F extends (...args: any[]) => any, P> = InvocationContext<S, F, P> & {
  error: Error;
  err: Error;
};

export type SuccessMessageInvocationContext<S, F extends (...args: any[]) => any, P> = EffectsInvocationContext<
  S,
  F,
  P
>;
export type ErrorMessageInvocationContext<S, F extends (...args: any[]) => any, P> = ErrorEffectsInvocationContext<
  S,
  F,
  P
>;

export type SideEffectsInvocationContext<S, F extends (...args: any[]) => any, P, A> = EffectsInvocationContext<
  S,
  F,
  P
> &
  InvocationContextActions<A> &
  WarningNotifyFunc;

export type ErrorSideEffectsInvocationContext<
  S,
  F extends (...args: any[]) => any,
  P,
  A
> = ErrorEffectsInvocationContext<S, F, P> & InvocationContextActions<A> & WarningNotifyFunc;

export type OnMountInvocationContext<S, A, P> = ContextBase<S, P> & InvocationContextActions<A>;

export type EffectsType = 'preEffects' | 'effects' | 'errorEffects' | 'optimisticEffects' | null;

export type MiddlewareActionContext<S, A, P> = {
  name: keyof A;
  type: EffectsType;
  isAsync: boolean;
  context: InvocationContext<S, any, P>;
};

export type MiddlewareStoreContext<S, A extends DecoratedActions, P> = {
  actions: StoreActions<S, A, P>;
  options: StoreOptions<S, A, P, any>;
};

export type Middleware<S, A extends DecoratedActions, P> = {
  init: (storeContext: MiddlewareStoreContext<S, A, P>) => void;
  effects: (
    actionContext: MiddlewareActionContext<S, A, P>,
    oldState: S,
    newState: S,
    loading: boolean
  ) => null | {
    state: S;
    loading: boolean;
  };
  destroy: () => void;
};

export type AsyncActionBase<S, F extends (...args: any[]) => any, A, P, FxRes = S> = {
  /**
   * This action can be aborted. An abortSignal will be injected to the <code>promise</code> / <code>promiseGet</code>.
   */
  abortable?: boolean;

  /**
   * A function that provides the success message to pass to the notifySuccess function passed as property to the StateDecorator.
   */
  getSuccessMessage?: (ctx: SuccessMessageInvocationContext<S, F, P>) => string;

  /**
   * A function that provides the error message to pass to the notifyError function passed as property to the StateDecorator.
   */
  getErrorMessage?: GetErrorMessage<S, F, P>;

  /**
   * If set, called with the result of the promise to update the current state.
   */
  effects?: (ctx: EffectsInvocationContext<S, F, P>) => FxRes | null;

  /**
   * If set, called with the error of the promise to update the current state.
   */
  errorEffects?: (ctx: ErrorEffectsInvocationContext<S, F, P>) => FxRes | null;

  /**
   * Whether reject the promise instead of handling it.
   */
  rejectPromiseOnError?: boolean;

  /**
   * Handle side effects when the request succeeded.
   * @param result The result of the request
   * @param newData The data after the reducer is applied
   * @param args The argument during the call of the request function
   * @param props The props passed to the state decorator
   * @param actions The actions available
   * @param notifyWarning If specified, a notify function to indicate that the action is a semi success (use successMessage / getSuccessMessage otherwise).
   */
  sideEffects?: (ctx: SideEffectsInvocationContext<S, F, P, A>) => void;

  /**
   * Handle side effects when the request failed.
   * @param error The error of the request
   * @param args The argument during the call of the request function
   * @param props The props passed to the state decorator
   * @param actions The actions available
   * @param notifyWarning If specified, a notify function to indicate that the action is a semi failure (use errorMessage / getErrorMessage otherwise).
   */
  errorSideEffects?: (ctx: ErrorSideEffectsInvocationContext<S, F, P, A>) => void;

  /**
   * Retrieve the state to set as current data before the promise is resolved.
   * If the there's no reducer, this data will be used after the promise is done.
   */
  preEffects?: (ctx: InvocationContext<S, F, P>) => FxRes | null;

  /**
   * Retrieve the state to set as current data before the promise is resolved.
   * If the there's no reducer, this data will be used after the promise is done.
   */
  optimisticEffects?: (ctx: InvocationContext<S, F, P>) => FxRes | null;

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

export type AsyncActionPromise<S, F extends (...args: any[]) => any, A, P, FxRes = S> = AsyncActionBase<
  S,
  F,
  A,
  P,
  FxRes
> & {
  /**
   * The request, returns a promise
   */
  getPromise: PromiseProvider<S, F, A, P>;
};

export type AsyncActionPromiseGet<S, F extends (...args: any[]) => any, A, P, FxRes = S> = AsyncActionBase<
  S,
  F,
  A,
  P,
  FxRes
> & {
  /**
   * The request, returns a promise that is a GET request.
   * A shortcut to set:
   *   - retryCount: 3
   *   - conflictPolicy: ConflictPolicy.REUSE
   */
  getGetPromise: PromiseProvider<S, F, A, P>;
};

export type AsyncAction<S, F extends (...args: any[]) => any, A, P, FxRes = S> =
  | AsyncActionPromise<S, F, A, P, FxRes>
  | AsyncActionPromiseGet<S, F, A, P, FxRes>;

export type StoreAction<S, F extends (...args: any[]) => any, A, P, FxRes = S> =
  | AsyncAction<S, F, A, P, FxRes>
  | SimpleSyncAction<S, F, P, FxRes>
  | SyncAction<S, F, A, P, FxRes>;

/**
 * S: The type of the state
 * A: The type of the actions to pass to the children (used to check keys only).
 */
export type StoreActions<S, A extends DecoratedActions, P = {}, FxRes = S> = {
  [Prop in keyof A]: StoreAction<S, A[Prop], A, P, FxRes>;
};

export type OnPropsChangeEffectsContext<S, P> = ContextBase<S, P> & {
  indices: number[];
};

export type OnPropsChangeSideEffectsContext<S, P, A> = OnPropsChangeEffectsContext<S, P> & {
  actions: A;
  a: A;
};

type DerivedStateOption<S, P, DS> = {
  [k in keyof DS]: {
    getDeps: (ctx: ContextBase<S, P>) => any[];
    get: (ctx: ContextBase<S, P>) => DS[k];
  };
};

export type StoreOptions<S, A, P, DS = S> = {
  /**
   * The state decorator name. Use in debug traces to identify the useStateDecorator instance.
   */
  name?: string;

  onPropsChange?: {
    getDeps: (p: P) => any[];
    effects?: (ctx: OnPropsChangeEffectsContext<S, P>) => S;
    sideEffects?: (ctx: OnPropsChangeSideEffectsContext<S, P, A>) => void;
  };

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
   * Compute derived state
   */
  derivedState?: DerivedStateOption<S, P, DS>;
};
