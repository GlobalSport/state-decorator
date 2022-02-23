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

import { ConflictPolicy, DecoratedActions, NotifyFunc, PromiseResult } from './types';

export type PromiseProvider<S, F extends (...args: any[]) => any, A, P> = (
  args: Parameters<F>,
  state: S,
  props: P,
  actions: A,
  abortSignal: AbortSignal
) => ReturnType<F> | null;

/**
 * Simple form of a synchronous action.
 */
export type SynchAction<S, F extends (...args: any[]) => any, P> = (
  state: S,
  args: Parameters<F>,
  props: P
) => S | null;

/**
 * Advanced synchronous action.
 * Allows to set advanced properties to a synchronous action.
 */
export type AdvancedSynchAction<S, F extends (...args: any[]) => any, A, P> = {
  /**
   * The action to execute.
   */
  action: (state: S, args: Parameters<F>, props: P) => S | null;
  /**
   * Debounces the side effects if this parameter is defined.
   */
  debounceSideEffectsTimeout?: number;

  /**
   * Debounces the action if this parameter is defined.
   */
  debounceTimeout?: number;

  /**
   * Action to call when the action is done. Used to trigger other actions (even asynchronous),
   */
  onActionDone?: (state: S, args: Parameters<F>, props: P, actions: A, notifyWarning: NotifyFunc) => void;
};

export type PromiseIdMap = { [promiseId: string]: boolean };

export type InternalLoadingMap<A> = { [name: string]: undefined | boolean | PromiseIdMap };
export type LoadingMap<A> = { [P in keyof A]?: undefined | boolean };
export type LoadingMapParallelActions<A> = { [P in keyof A]?: PromiseIdMap };

export type LoadingProps<A> = {
  loading: boolean;
  loadingMap: LoadingMap<A>;
  loadingParallelMap: LoadingMapParallelActions<A>;
};

/**
 * Try to abort an action, if the action is <code>abortable</code>.
 * @param actionName The action name
 * @param promiseId If the action conflict type is <code>ConflictType.PARALLEL</code>, the identifier of the promise.
 * @returns <code>true</code> if the action is abortable and an action is ongoing, <code>false</code> otherwise.
 */
export type AbortActionCallback<A> = (actionName: keyof A, promiseId?: string) => boolean;

export type GetErrorMessage<F extends (...args: any[]) => any, P> = (e: any, args: Parameters<F>, props: P) => string;

export interface AsynchActionBase<S, F extends (...args: any[]) => any, A, P> {
  /**
   * This action can be aborted. An abortSignal will be injected to the <code>promise</code> / <code>promiseGet</code>.
   */

  abortable?: boolean;

  /**
   * The success message to pass to the notifySuccess function passed as property to the StateDecorator.
   */
  successMessage?: string;

  /**
   * A function that provides the success message to pass to the notifySuccess function passed as property to the StateDecorator.
   */
  getSuccessMessage?: (result: PromiseResult<ReturnType<F>>, args: Parameters<F>, props: P) => string;

  /**
   * The error message to pass to the notifyError function passed as property to the StateDecorator.
   */
  errorMessage?: string;

  /**
   * A function that provides the error message to pass to the notifyError function passed as property to the StateDecorator.
   */
  getErrorMessage?: GetErrorMessage<F, P>;

  /**
   * If set, called with the result of the promise to update the current state.
   */
  reducer?: (state: S, result: PromiseResult<ReturnType<F>>, args: Parameters<F>, props: P) => S | null;

  /**
   * If set, called with the error of the promise to update the current state.
   */
  errorReducer?: (state: S, error: any, args: Parameters<F>, props: P) => S | null;

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
  onDone?: (
    state: S,
    result: PromiseResult<ReturnType<F>>,
    args: Parameters<F>,
    props: P,
    actions: A,
    notifyWarning: NotifyFunc
  ) => void;

  /**
   * Handle side effects when the request failed.
   * @param error The error of the request
   * @param args The argument during the call of the request function
   * @param props The props passed to the state decorator
   * @param actions The actions available
   * @param notifyWarning If specified, a notify function to indicate that the action is a semi failure (use errorMessage / getErrorMessage otherwise).
   */
  onFail?: (state: S, error: Error, args: Parameters<F>, props: P, actions: A, notifyWarning: NotifyFunc) => void;

  /**
   * Retrieve the state to set as current data before the promise is resolved.
   * If the there's no reducer, this data will be used after the promise is done.
   */
  preReducer?: (state: S, args: Parameters<F>, props: P) => S | null;

  /**
   * Retrieve the state to set as current data before the promise is resolved.
   * If the there's no reducer, this data will be used after the promise is done.
   */
  optimisticReducer?: (state: S, args: Parameters<F>, props: P) => S | null;

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
}

export interface AsynchActionPromise<S, F extends (...args: any[]) => any, A, P> extends AsynchActionBase<S, F, A, P> {
  /**
   * The request, returns a promise
   */
  promise: PromiseProvider<S, F, A, P>;
}
export interface AsynchActionPromiseGet<S, F extends (...args: any[]) => any, A, P>
  extends AsynchActionBase<S, F, A, P> {
  /**
   * The request, returns a promise that is a GET request.
   * A shortcut to set:
   *   - retryCount: 3
   *   - conflictPolicy: ConflictPolicy.REUSE
   */
  promiseGet: PromiseProvider<S, F, A, P>;
}

export type AsynchAction<S, F extends (...args: any[]) => any, A, P> =
  | AsynchActionPromise<S, F, A, P>
  | AsynchActionPromiseGet<S, F, A, P>;

export type StateDecoratorAction<S, F extends (...args: any[]) => any, A, P> =
  | AsynchAction<S, F, A, P>
  | SynchAction<S, F, P>
  | AdvancedSynchAction<S, F, A, P>;

/**
 * S: The type of the state
 * A: The type of the actions to pass to the children (used to check keys only).
 */
export type StateDecoratorActions<S, A extends DecoratedActions, P = {}> = {
  [Prop in keyof A]: StateDecoratorAction<S, A[Prop], A, P>;
};

type OnPropsChangeReducer<S, P> = (s: S, newProps: P, updatedIndices: number[]) => S;

export type StateDecoratorOptions<S, A, P = {}> = {
  /**
   * The state decorator name. Use in debug traces to identify the useStateDecorator instance.
   */
  name?: string;

  /**
   * Show logs in the console in development mode.
   */
  logEnabled?: boolean;

  /**
   * List of action names that are marked as loading at initial time.
   * As a render is done before first actions can be trigerred, some actions can be marked as loading at
   * initial time.
   */
  initialActionsMarkedLoading?: (keyof A)[];

  /**
   * Get a list of values that will be use as reference values.
   * If they are different (shallow compare), onPropsChangeReducer then onPropsChange will be called.
   */
  getPropsRefValues?: (props: P) => any[];

  /**
   * Triggered when values of reference from props have changed. Allow to call actions after a prop change.
   */
  onPropsChange?: (s: S, newProps: any, actions: A, updatedIndices: number[]) => void;

  /**
   * Triggered when values of reference from props have changed. Allow to update state after a prop change.
   * <b>null</b> means no change.
   */
  onPropsChangeReducer?: OnPropsChangeReducer<S, P>;

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
   * Initial actions. They are executed outside of a side effect to trigger asynchronous actions.
   */
  onMount?: (actions: A, props: P, state: S) => void;
};
