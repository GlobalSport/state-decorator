/*
 * Copyright 2018 Globalsport SAS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React from 'react';
import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';

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
}

type PromiseFunc = (...args) => Promise<any | void>;

export type SynchAction<S> = (state: S, ...args: any[]) => S | null;

type LoadingMap<A> = { [P in keyof A]: boolean | undefined };

type Props = any;

type PromiseReducer<S> = (state: S, data: any, args: any[], props: Props) => S | null;

type PromiseErrorReducer<S> = (state: S, error: any, args: any[], props: Props) => S | null;

type ErrorMessageFunc = (e: Error, args: any[], props: Props) => string;

type SuccessMessageFunc = (result: any, args: any[], props: Props) => string;

type PromiseDoneFunc<S> = (state: S, result: any, args: any[], props: Props) => void;

type PromiseOptimisticReducer<S> = (state: S, args: any[], props: Props) => S | null;

export interface AsynchAction<S> {
  /**
   * The success message to pass to the notifySuccess function passed as property to the StateDecorator.
   */
  successMessage?: string;

  /**
   * A function that provides the success message to pass to the notifySuccess function passed as property to the StateDecorator.
   */
  getSuccessMessage?: SuccessMessageFunc;

  /**
   * The error message to pass to the notifyError function passed as property to the StateDecorator.
   */
  errorMessage?: string;

  /**
   * A function that provides the error message to pass to the notifyError function passed as property to the StateDecorator.
   */
  getErrorMessage?: ErrorMessageFunc;

  /**
   * The request, returns a promise
   */
  promise: PromiseFunc;

  /**
   * If set, called with the result of the promise to update the current state.
   */
  reducer?: PromiseReducer<S>;

  /**
   * If set, called with the error of the promise to update the current state.
   */
  errorReducer?: PromiseErrorReducer<S>;

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
  onDone?: PromiseDoneFunc<S>;

  /**
   * Retrieve the state to set as current data before the promise is resolved.
   * If the there's no reducer, this data will be used after the promise is done.
   */
  optimisticReducer?: PromiseOptimisticReducer<S>;

  /**
   * Policy to apply when a call to an asynchronous action is done but a previous call is still not resolved.
   */
  conflictPolicy?: ConflictPolicy;
}

export type StateDecoratorAction<S> = AsynchAction<S> | SynchAction<S>;

/**
 * S: The type of the state
 * A: The type of the actions to pass to the children (used to check keys only).
 */
export type StateDecoratorActions<S, A extends DecoratedActions> = { [P in keyof A]: StateDecoratorAction<S> };

interface StateDecoratorProps<S, A extends DecoratedActions> {
  /**
   * The action definitions.
   */
  actions: StateDecoratorActions<S, A>;
  /**
   * The initial state. Ie before any reducer is called.
   */
  initialState?: S;
  /**
   * Optional properties to pass to actions.
   */
  props?: Props;
  /**
   * Show logs in the console.
   */
  logEnabled?: boolean;
  /**
   * The callback function called if an asynchronous function succeeded and a success messsage is defined.
   */
  notifySuccess?: (message: string) => void;
  /**
   * The callback function called if an asynchronous function fails and an error messsage is defined.
   */
  notifyError?: (message: string) => void;
  /**
   * Function to call when the StateDecorator is mounted. Usually used to call an initial action.
   */
  onMount?: (actions: A, props: Props) => void;
  /**
   * Child function,
   */
  children: (
    state: S,
    actions: A,
    loading: boolean,
    loadingByAction: LoadingMap<A>
  ) => JSX.Element | JSX.Element[] | string;
}

interface StateDecoratorState<S> {
  data?: S;
  loading?: boolean;
}

interface ActionHistory<S> {
  name: string;
  reducer: string;
  args: any[];
  beforeState?: S;
}

interface OptimisticActionsMap {
  [name: string]: any;
}

type FutureActions = {
  args: any[];
  resolve: (...args) => void;
  reject: (...args) => void;
  timestamp?: number;
};

type ReducerName = 'reducer' | 'optimisticReducer' | 'errorReducer';

interface ConflictActionsMap {
  [name: string]: FutureActions[];
}

const IS_JEST_ENV = typeof process !== 'undefined' && process && !(process as any).browser;

/**
 * Type guard function to test if an action is a asynchronous action.
 */
export function isAsyncAction<S>(action: StateDecoratorAction<S>): action is AsynchAction<S> {
  return !(action instanceof Function);
}

/**
 * Type guard function to test if an action is a synchronous action.
 */
export function isSyncAction<S>(action: StateDecoratorAction<S>): action is SynchAction<S> {
  return !isAsyncAction(action);
}

/**
 * A state container designed to substitute the local state of a component.
 * Types:
 *   - S: The interface of the State to manange.
 *   - A: The interface of the Actions to pass to the child component.
 *
 * Input: an object that contains synchronous action and/or asynchronous actions
 *
 * The child of this component is a function with the action, current state and aynchronous action related properties.
 */
export default class StateDecorator<S, A extends DecoratedActions> extends React.PureComponent<
  StateDecoratorProps<S, A>,
  StateDecoratorState<S>
> {
  static defaultProps = {
    logEnabled: false,
  };

  private mounted = undefined;
  private loadingMap: LoadingMap<A>;
  private history: ActionHistory<S>[] = [];
  private optimisticActions: OptimisticActionsMap = {};
  private shouldRecordHistory: boolean = false;
  private dataState: S = this.props.initialState === undefined ? undefined : this.props.initialState;
  private promises: { [name: string]: Promise<any> } = {};
  private conflictActions: ConflictActionsMap = {};

  /**
   * Adds an action to the action history (only when at least one optimistic action is ongoing).
   * @param name The action name
   * @param reducer The reducer name
   * @param args The arguments of the action.
   * @param beforeState state before the optimistic action
   */
  private pushActionToHistory(name: string, reducer: ReducerName, args, beforeState = null) {
    if (this.shouldRecordHistory) {
      if (this.history === null) {
        this.history = [];
      }

      this.history.push({ name, reducer, beforeState, args });
    }
  }

  /**
   * Undo the optimistic action.
   * Strategy:
   *  - Get the state before the optimistic reducer
   *  - Replay all actions that occured after the optimistic action.
   * @param name The action name.
   */
  private undoOptimisticAction(name: string) {
    if (!this.optimisticActions[name]) {
      return null;
    }

    // raw actions from props
    const { actions } = this.props;

    // find the optimistic action in the history
    const index = this.history.findIndex((a) => a.name === name);

    let state = this.history[index].beforeState;

    // remove it as this optimistic action fails
    this.history.splice(index, 1);

    for (let i = index; i < this.history.length; i++) {
      const action = this.history[i];

      // This is an optimistic action, update restore state
      if (action.beforeState) {
        action.beforeState = state;
      }

      const rawAction = actions[action.name];
      if (isAsyncAction(rawAction)) {
        state = rawAction[action.reducer](state, ...action.args);
      } else {
        state = rawAction(state, ...action.args);
      }
    }

    // clean up
    this.cleanHistoryAfterOptimistAction(name, index);

    return state;
  }

  private cleanHistoryAfterOptimistAction(name: string, indexInHistory: number = undefined) {
    if (!this.optimisticActions[name]) {
      return null;
    }

    delete this.optimisticActions[name];

    const optiStateKeys = Object.keys(this.optimisticActions);

    if (optiStateKeys.length === 0) {
      this.history = null;
      this.shouldRecordHistory = false;
    } else {
      const index = indexInHistory === undefined ? this.history.findIndex((a) => a.name === name) : indexInHistory;

      if (index === 0) {
        // this was the first optimist action, so find the next one
        const index = this.history.findIndex((a) => a.beforeState != null);

        // forget actions before the first optimist action in the history
        this.history.splice(0, index);
      } else if (indexInHistory === undefined) {
        // success use case.
        // this was not the first optimist action, but can forget the saved state.
        // it becomes an asynchronous action.
        this.history[index].beforeState = null;
      }
    }
  }

  componentDidMount() {
    const { onMount, props } = this.props;
    if (onMount) {
      onMount(this.actions, props);
    }
    this.mounted = true;
  }

  componentDidUpdate(nextProps) {
    if (nextProps.actions !== this.props.actions) {
      throw new Error(
        'StateDecorator: actions have changed. This is not managed, please make sure to not change the service definition'
      );
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  decorateActions = (actions: StateDecoratorActions<S, A>): A => {
    this.loadingMap = Object.keys(actions)
      .filter((k) => !(actions[k] instanceof Function))
      .reduce(
        (acc, key) => {
          acc[key] = undefined;
          return acc;
        },
        {} as LoadingMap<A>
      );

    return Object.keys(actions)
      .map((name) => {
        const action = actions[name];

        // synchronous actuib
        if (isSyncAction(action)) {
          return {
            name,
            action: this.getDecoratedSynchAction(name, action),
          };
        }

        // asynchronous action
        return {
          name,
          action: this.getDecoratedAsynchAction(name, action),
        };
      })
      .reduce(
        (acc, service) => {
          acc[service.name] = service.action;
          return acc;
        },
        {} as A
      );
  };

  private static buildDiff(oldState, newState) {
    const res = {};

    Object.keys(oldState).forEach((k) => {
      if (newState.hasOwnProperty(k)) {
        const oldValue = oldState[k];
        const newValue = newState[k];

        if (newValue !== oldValue) {
          const type = newState[k] == null ? typeof oldState[k] : typeof newState[k];
          if (type === 'number' || type === 'string' || type === 'boolean') {
            res[k] = `${oldState[k]} => ${newState[k] === '' ? '""' : newState[k]}`;
          } else if ((oldValue && oldValue.length) || (newValue && newValue.length)) {
            if (oldValue == null) {
              res[k] = `was null, now contains ${newValue.length} elements`;
            } else if (newValue == null) {
              res[k] = `contained ${oldValue.length} elements, now is null`;
            } else if (oldValue.length === 0) {
              res[k] = `was empty, now contains ${newValue.length} elements`;
            } else if (newValue.length === 0) {
              res[k] = `contained ${oldValue.length} elements, now is empty`;
            } else {
              let addedValues = newValue.filter((a) => !oldValue.find((b) => isEqual(a, b)));
              let removedValues = oldValue.filter((a) => !newValue.find((b) => isEqual(a, b)));

              if (addedValues.length > 10) {
                addedValues = `${addedValues.length} elements added`;
              }
              if (removedValues.length > 10) {
                removedValues = `${removedValues.length} elements removed`;
              }
              res[k] = {
                added: addedValues,
                removed: removedValues,
              };
            }
          } else {
            res[k] = newState[k];
          }
        }
      } else {
        res[k] = 'was deleted';
      }
    });

    Object.keys(newState).forEach((k) => {
      if (!oldState.hasOwnProperty(k)) {
        res[k] = `${newState[k]}`;
      }
    });

    return res;
  }

  private logStateChange = (name: string, newState: S, args: any[], failed = false) => {
    const { data } = this.state;
    const { logEnabled } = this.props;

    if (logEnabled) {
      console.group(`[StateDecorator] Action ${name} ${failed ? 'FAILED' : ''}`);
      if (Object.keys(args).length > 0) {
        console.group('Arguments');
        Object.keys(args).forEach((prop) => console.log(prop, ':', args[prop]));
        console.groupEnd();
      }
      console.groupCollapsed('Before');
      Object.keys(data).forEach((prop) => console.log(prop, ':', data[prop]));
      console.groupEnd();

      console.groupCollapsed('After');
      Object.keys(newState).forEach((prop) => console.log(prop, ':', newState[prop]));
      console.groupEnd();

      console.group('Diff');
      const diff = StateDecorator.buildDiff(data, newState);
      Object.keys(diff).forEach((prop) => console.log(prop, ':', diff[prop]));
      console.groupEnd();

      console.groupEnd();
    }
  };

  private isSomeRequestLoading = () => Object.keys(this.loadingMap).some((name) => this.loadingMap[name]);

  private handleConflictingAction(name: string, conflictPolicy: ConflictPolicy, args: any[]) {
    return new Promise((resolve, reject) => {
      const futureAction = {
        resolve,
        reject,
        args: cloneDeep(args),
        timestamp: Date.now(),
      };

      switch (conflictPolicy) {
        case ConflictPolicy.IGNORE:
          resolve();
          break;
        case ConflictPolicy.REJECT:
          reject(new Error(`An asynch action ${name} is already ongoing.`));
          break;
        case ConflictPolicy.KEEP_LAST: {
          this.conflictActions[name] = [futureAction];
          break;
        }
        case ConflictPolicy.KEEP_ALL: {
          let stack = this.conflictActions[name];
          if (!stack) {
            this.conflictActions[name] = stack = [];
          }
          stack.push(futureAction);
          break;
        }
        default:
          // will trigger a compilation error if one of the enum values is not processed.
          const exhaustiveCheck: never = conflictPolicy;
          exhaustiveCheck;
          break;
      }
    });
  }

  private getDecoratedSynchAction = (name: string, action: SynchAction<S>) => (...args) => {
    const data = this.dataState;
    const { props, logEnabled } = this.props;

    const newDataState = action(data, ...args, props);

    if (newDataState !== null) {
      this.pushActionToHistory(name, null, [...args, props]);

      this.logStateChange(name, newDataState, args);

      this.dataState = newDataState;
      this.setState({
        data: this.dataState,
      });

      // backward compatible
      return Promise.resolve();
    }

    if (logEnabled) {
      console.group(`[StateDecorator] Action ${name}`);
      console.group('Arguments');
      Object.keys(args).forEach((prop) => console.log(prop, ':', args[prop]));
      console.groupEnd();
      console.groupEnd();
    }
    return Promise.resolve();
  };

  private processNextConflictAction(name: string) {
    const futureActions = this.conflictActions[name];

    if (futureActions && futureActions.length > 0) {
      const futureAction = this.conflictActions[name].shift();

      if (futureAction) {
        (this.actions[name](...futureAction.args) as Promise<any>)
          .then(futureAction.resolve)
          .catch((e) => futureAction.reject(e));
      }
    }
  }

  private getDecoratedAsynchAction = (
    name,
    {
      promise,
      reducer,
      errorReducer,
      onDone,
      optimisticReducer,
      successMessage,
      errorMessage,
      getErrorMessage,
      getSuccessMessage,
      conflictPolicy = ConflictPolicy.KEEP_LAST,
      rejectPromiseOnError,
    }: AsynchAction<S>
  ) => (...args) => {
    const dataState = this.dataState;
    const { logEnabled, notifySuccess, notifyError, props } = this.props;

    if (this.loadingMap[name]) {
      return this.handleConflictingAction(name, conflictPolicy, args);
    }

    const p = promise(...args, dataState, props, this.actions)
      .then((result) => {
        // Need to get the data here because when chaining action the above variable is NOT up to date.
        const dataState = this.dataState;

        this.loadingMap[name] = false;

        const newState: Partial<StateDecoratorState<S>> = {
          loading: this.isSomeRequestLoading(),
        };

        if (reducer) {
          const newDataState = reducer(dataState, result, args, props);

          if (newDataState !== null) {
            this.pushActionToHistory(name, 'reducer', [result, args, props]);

            newState.data = newDataState;
            this.dataState = newState.data;

            this.logStateChange(name, newState.data, args);
          }
        } else if (logEnabled) {
          console.group(`[StateDecorator] Action ${name}`);
          if (Object.keys(args).length > 0) {
            console.group('Arguments');
            Object.keys(args).forEach((prop) => console.log(prop, ':', args[prop]));
            console.groupEnd();
          }
          console.groupEnd();
        }

        if (notifySuccess && (successMessage !== undefined || getSuccessMessage !== undefined)) {
          let msg;

          if (getSuccessMessage !== undefined) {
            msg = getSuccessMessage(result, args, props);
          }

          if (!msg) {
            msg = successMessage;
          }

          if (msg) {
            notifySuccess(msg);
          }
        }

        this.cleanHistoryAfterOptimistAction(name);

        if (onDone) {
          onDone(newState.data || dataState, result, args, props);
        }

        delete this.promises[name];
        this.setState(newState);

        this.processNextConflictAction(name);

        return Promise.resolve(result);
      })
      .catch((error) => {
        const dataState = this.dataState;

        this.loadingMap[name] = false;
        const newState: Partial<StateDecoratorState<S>> = {
          data: dataState,
          loading: this.isSomeRequestLoading(),
        };

        if (this.optimisticActions[name]) {
          newState.data = this.undoOptimisticAction(name);
          this.dataState = newState.data;
        }

        let errorHandled = false;

        if (errorReducer) {
          errorHandled = true;
          const newDataState = errorReducer(dataState, error, args, props);
          if (newDataState !== null) {
            this.pushActionToHistory(name, 'errorReducer', [error, args, props]);
            newState.data = newDataState;

            this.dataState = newState.data;
          }
        }

        if (notifyError && (errorMessage !== undefined || getErrorMessage !== undefined)) {
          let msg;
          errorHandled = true;

          if (getErrorMessage !== undefined) {
            msg = getErrorMessage(error, args, props);
          }

          if (!msg) {
            msg = errorMessage;
          }

          if (msg) {
            notifyError(msg);
          }
        }

        if (logEnabled) {
          this.logStateChange(name, newState.data, args);
        }

        const result = !errorHandled || rejectPromiseOnError ? Promise.reject(error) : undefined;

        delete this.promises[name];

        this.setState(newState);

        this.processNextConflictAction(name);

        return result;
      });

    // Asynchronous action was just trigerred, manage loading & optimistic state.
    const loadingState: Partial<StateDecoratorState<S>> = {
      loading: true,
    };

    this.promises[name] = p;

    const isSomeRequestLoadingBefore = this.isSomeRequestLoading();

    this.loadingMap[name] = true;

    if (optimisticReducer) {
      const newDataState = optimisticReducer(dataState, args, props);
      if (newDataState !== null) {
        loadingState.data = newDataState;
        this.dataState = newDataState;
        this.optimisticActions[name] = true;
        this.shouldRecordHistory = true;
        this.pushActionToHistory(name, 'optimisticReducer', [cloneDeep(args), cloneDeep(props)], cloneDeep(dataState));

        // During optimistic request, we do not want to see the loading state.
        // However, the loading state is available in the loading map.
        loadingState.loading = isSomeRequestLoadingBefore;
      }
    }

    this.setState(loadingState);

    return p;
  };

  setState(newState: any, cb = null) {
    if (this.mounted !== false || IS_JEST_ENV) {
      super.setState(newState, cb);
    }
  }

  /**
   * The decorated action, passed the children render function
   */
  private actions: A = this.decorateActions(this.props.actions);

  state = {
    data: this.props.initialState === undefined ? undefined : this.props.initialState,
    loading: false,
  };

  render() {
    const { children } = this.props;
    const { loading } = this.state;

    return children(this.dataState, this.actions, loading, { ...(this.loadingMap as any) });
  }
}
