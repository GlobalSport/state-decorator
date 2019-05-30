export type PromiseResult<Type> = Type extends Promise<infer X> ? X : null;

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
  args: Parameters<F>,
  state: S,
  props: P,
  actions: A
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
   * Debounces the action if this parameter is defined.
   */
  debounceTimeout?: number;
  /**
   * Action to call when the action is done. Used to trigger other actions (even asynchronous),
   */
  onActionDone?: (state: S, args: Parameters<F>, props: P, actions: A) => void;
};

export type PromiseIdMap = { [promiseId: string]: boolean };

export type InternalLoadingMap<A> = { [P in keyof A]: undefined | boolean | PromiseIdMap };
export type LoadingMap<A> = { [P in keyof A]: undefined | boolean };
export type LoadingMapParallelActions<A> = { [P in keyof A]: PromiseIdMap };

export type LoadingProps<A> = {
  loading: boolean;
  loadingMap: LoadingMap<A>;
  loadingParallelMap: LoadingMapParallelActions<A>;
};

export interface AsynchActionBase<S, F extends (...args: any[]) => any, A, P> {
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
  getErrorMessage?: (e: Error, args: Parameters<F>, props: P) => string;

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
   * Handle called when the request is done.
   * @param result The result of the request
   * @param newData The data after the reducer is applied
   * @param args The argument during the call of the request function
   */
  onDone?: (state: S, result: PromiseResult<ReturnType<F>>, args: Parameters<F>, props: P, actions: A) => void;

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
  [Prop in keyof A]: StateDecoratorAction<S, A[Prop], A, P>
};
