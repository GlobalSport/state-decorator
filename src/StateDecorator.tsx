/*
 * Copyright 2019 Globalsport SAS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React from 'react';
import fastClone from 'fast-clone';
import {
  StateDecoratorActions as SDA,
  DecoratedActions,
  LoadingMap,
  LoadingMapParallelActions,
  AsynchAction,
  SynchAction,
  AdvancedSynchAction,
  ConflictPolicy,
  InternalLoadingMap,
  AsynchActionPromise,
  PromiseIdMap,
  LoadingProps,
  ConflictActionsMap,
  OptimisticActionsMap,
  ActionHistory,
  ReducerName,
} from './types';
import {
  isAsyncAction,
  logStateChange,
  isSyncAction,
  isAdvancedSyncAction,
  computeAsyncActionInput,
  areSameArgs,
  logSingle,
  retryDecorator,
  IS_JEST_ENV,
} from './base';

export type StateDecoratorActions<S, A extends DecoratedActions, P = {}> = SDA<S, A, P>;

export interface StateDecoratorProps<S, A extends DecoratedActions, P = {}> {
  /**
   * The action definitions.
   */
  actions: StateDecoratorActions<S, A, P>;

  /**
   * The initial state. Ie before any reducer is called.
   */
  initialState?: S;

  /**
   * Optional properties to pass to actions.
   */
  props?: P;

  /**
   * Show logs in the console in development mode.
   */
  logEnabled?: boolean;

  /**
   * Get a list of values that will be use as reference values.
   * If they are different (shallow compare), onPropsChangeReducer then onPropsChange will be called.
   */
  getPropsRefValues?: (props: any) => any[];

  /**
   * Triggered when values of reference from props have changed. Allow to update state after a prop change.
   * <b>null</b> means no change.
   */
  onPropsChangeReducer?: (s: S, newProps: any, updatedIndices: number[]) => S;

  /**
   * Triggered when values of reference from props have changed. Allow to call actions after a prop change.
   */
  onPropsChange?: (s: S, newProps: any, actions: A, updatedIndices: number[]) => void;

  /**
   * The callback function called if an asynchronous function succeeded and a success messsage is defined.
   */
  notifySuccess?: (message: string) => void;

  /**
   * The callback function called if an asynchronous function fails and an error messsage is defined.
   */
  notifyError?: (message: string) => void;

  /**
   * Function to call when the StateDecorator is mounted. Usually used to call a function to populate an initial action.
   */
  onMount?: (actions: A, props: P) => void;

  /**
   * Function to call when the StateDecorator is unmounted. Usually used to persist a state.
   */
  onUnmount?: (s: S, props: P) => void;

  /**
   * Function to call when the page is about to be unloaded (page refreshed, tab/window closed). Usually used to persist a state.
   */
  onUnload?: (s: S, props: P) => void;

  /**
   * Child function,
   */
  children?: (
    state: S,
    actions: A,
    loading: boolean,
    loadingByAction: LoadingMap<A>,
    loadingParallelActions: LoadingMapParallelActions<A>
  ) => JSX.Element | JSX.Element[] | string;
}

interface StateDecoratorState<S, A> {
  data?: S;
  loading?: boolean;
  actions?: A;
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
export default class StateDecorator<S, A extends DecoratedActions, P = {}> extends React.PureComponent<
  StateDecoratorProps<S, A, P>,
  StateDecoratorState<S, A>
> {
  static defaultProps = {
    logEnabled: false,
  };

  /**
   * Handles asynchronous promise rejection error.
   * @param error The promise error.
   * @param isHandled Whether the error was handled with an error message or an error reducer.
   */
  static onAsyncError(error: any, isHandled: boolean) {}

  /**
   * Clones an object. Used when managing optimistic reducer and conflicting actions.
   * @param obj The object to clone.
   */
  static clone(obj) {
    try {
      return fastClone(obj);
    } catch (e) {
      const msg =
        'StateDecorator: Cannot clone object. Override StateDecorator.clone with another implementation like lodash/cloneDeep.';
      if (process.env.NODE_ENV === 'development') {
        console.error(msg);
        console.error(e.toString());
      }
      throw new Error(msg);
    }
  }

  /**
   * Tests if the error will trigger a retry of the action or will fail directly.
   * Default implementation is returning true for TypeError instances only.
   * @param error an error
   */
  static isTriggerRetryError(error: Error) {
    return error instanceof TypeError;
  }

  /**
   *
   * Class attributes
   *
   */
  private mounted = undefined;
  private loadingMap: InternalLoadingMap<A>;
  private history: ActionHistory<S>[] = [];
  private optimisticActions: OptimisticActionsMap = {};
  private shouldRecordHistory: boolean = false;
  private dataState: S = this.props.initialState === undefined ? undefined : this.props.initialState;
  private promises: { [name: string]: { promise: Promise<any>; refArgs: any[] } } = {};
  private conflictActions: ConflictActionsMap = {};
  private hasParallelActions = false;
  private debounceActionMap: {
    [name: string]: any;
  } = {};

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
        state = (rawAction as any)(state, ...action.args);
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

  onUnload = () => {
    const { onUnload } = this.props;
    if (onUnload) {
      onUnload(this.dataState, this.props.props);
    }
  };

  componentDidMount() {
    const { onMount, props } = this.props;
    if (onMount) {
      onMount(this.actions, props);
    }

    this.mounted = true;

    window.addEventListener('beforeunload', this.onUnload);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    let newState = null;
    if (nextProps.getPropsRefValues && nextProps.props) {
      const { data, refValues } = prevState;

      const values = nextProps.getPropsRefValues(nextProps.props);
      let changedIndices = null;

      // test null cases + different lengths
      if ((!refValues && values) || (!values && refValues) || values.length !== refValues.length) {
        // invalidate all, non-optimized case because values array must be stable.
        changedIndices = Array.from(Array(values.length).keys());
      }

      // test values
      if (!changedIndices) {
        changedIndices = refValues.reduce((acc, value, index) => {
          let res = acc;
          if (value !== values[index]) {
            if (res === null) {
              res = [index];
            } else {
              res.push(index);
            }
          }
          return res;
        }, null);
      }

      let newData = null;
      if (changedIndices) {
        newData = nextProps.onPropsChangeReducer
          ? nextProps.onPropsChangeReducer(data, nextProps.props, changedIndices)
          : null;

        if (newData !== null) {
          newState = {
            refValues: values,
            data: newData,
          };
          logStateChange('onPropsChangeReducer', nextProps.logEnabled, data, newData, [], '');
        } else {
          newState = {
            refValues: values,
          };
        }

        if (nextProps.onPropsChange) {
          setTimeout(() => {
            if (process.env.NODE_ENV === 'development' && nextProps.logEnabled) {
              console.log('[StateDecorator] Action onPropsChange');
            }
            nextProps.onPropsChange(newData || data, nextProps.props, prevState.actions, changedIndices);
          });
        }
      }
    }
    return newState;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.actions !== this.props.actions) {
      throw new Error(
        'StateDecorator: actions have changed. This is not managed, please make sure to not change the service definition'
      );
    }
  }

  componentWillUnmount() {
    const { onUnmount } = this.props;

    this.mounted = false;

    if (onUnmount) {
      onUnmount(this.dataState, this.props.props);
    }

    window.removeEventListener('beforeunload', this.onUnload);
  }

  decorateActions = (actions: StateDecoratorActions<S, A, P>): A => {
    const asynchActionNames = Object.keys(actions).filter((k) => isAsyncAction(actions[k]));

    this.loadingMap = asynchActionNames.reduce(
      (acc, name) => {
        acc[name] = undefined;
        return acc;
      },
      {} as InternalLoadingMap<A>
    );

    this.hasParallelActions = asynchActionNames.some(
      (name) => (actions[name] as AsynchAction<S, any, any, P>).conflictPolicy === ConflictPolicy.PARALLEL
    );

    return Object.keys(actions)
      .map((name) => {
        const action = actions[name];

        if (isSyncAction(action)) {
          return {
            name,
            action: this.getDecoratedSynchAction(name, action),
          };
        }

        if (isAdvancedSyncAction(action)) {
          return {
            name,
            action: this.getDecoratedAdvancedSynchAction(name, action),
          };
        }

        // asynchronous action
        return {
          name,
          action: this.getDecoratedAsynchAction(name, computeAsyncActionInput(action)),
        };
      })
      .reduce(
        (acc, service) => {
          acc[service.name as keyof A] = service.action as any;
          return acc;
        },
        {} as A
      );
  };

  private isSomeRequestLoading = () =>
    Object.keys(this.loadingMap).some((name) => {
      const v = this.loadingMap[name];

      if (v === undefined) {
        return false;
      }

      if (typeof v === 'boolean') {
        return v;
      }

      return Object.keys(v).length > 0;
    });

  private handleConflictingAction(name: string, conflictPolicy: ConflictPolicy, args: any[]) {
    let policy: ConflictPolicy = conflictPolicy;
    if (policy === ConflictPolicy.REUSE) {
      if (areSameArgs(this.promises[name].refArgs, args)) {
        return this.promises[name].promise;
      } // else
      policy = ConflictPolicy.KEEP_ALL;
    }

    return new Promise((resolve, reject) => {
      const futureAction = {
        resolve,
        reject,
        args: StateDecorator.clone(args),
        timestamp: Date.now(),
      };

      switch (policy) {
        case ConflictPolicy.IGNORE:
          logSingle(name, args, this.props.logEnabled, 'Drop request (Conflict policy is IGNORE)');
          resolve();
          break;
        case ConflictPolicy.REJECT:
          logSingle(name, args, this.props.logEnabled, 'Reject request (Conflict policy is REJECT)');
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

  private getDecoratedSynchAction = (name: string, action: SynchAction<S, any, P>) => (...args: any[]) => {
    const data = this.dataState;
    const { props, logEnabled } = this.props;

    const newDataState = action(data, args, props);

    if (newDataState !== null) {
      this.pushActionToHistory(name, null, [args, props]);

      logStateChange(name, logEnabled, this.state.data, newDataState, args, 'synch reducer');

      this.dataState = newDataState;
      this.setState({
        data: this.dataState,
      });

      // backward compatible
      return Promise.resolve();
    }

    if (process.env.NODE_ENV === 'development' && logEnabled) {
      console.group(`[StateDecorator] Action ${name}`);
      console.group('Arguments');
      Object.keys(args).forEach((prop) => console.log(prop, ':', args[prop]));
      console.groupEnd();
      console.groupEnd();
    }
    return Promise.resolve();
  };

  private processSynchAction = (name: string, action: AdvancedSynchAction<S, any, A, P>, args: any[]) => {
    const { props, logEnabled } = this.props;
    const data = this.dataState;

    const newDataState = action.action(data, args, props);

    if (newDataState !== null) {
      this.pushActionToHistory(name, null, [args, props]);

      logStateChange(name, logEnabled, this.state.data, newDataState, args, 'synch reducer');

      this.dataState = newDataState;
      this.setState(
        {
          data: this.dataState,
        },
        () => {
          if (action.onActionDone) {
            action.onActionDone(newDataState, args, props, this.actions);
          }
        }
      );

      if (process.env.NODE_ENV === 'development' && logEnabled) {
        console.group(`[StateDecorator] Action ${name}`);
        console.group('Arguments');
        Object.keys(args).forEach((prop) => console.log(prop, ':', args[prop]));
        console.groupEnd();
        console.groupEnd();
      }
    }
    // backward compatible
    return Promise.resolve();
  };

  private getDecoratedAdvancedSynchAction = (name: string, action: AdvancedSynchAction<S, any, A, P>) => (
    ...args: any[]
  ) => {
    let res: Promise<any>;

    if (action.debounceTimeout != null) {
      if (this.debounceActionMap[name] != null) {
        clearTimeout(this.debounceActionMap[name]);
      }

      res = new Promise((res) => {
        this.debounceActionMap[name] = setTimeout(() => {
          this.debounceActionMap[name] = null;
          this.processSynchAction(name, action, args);
          res();
        }, action.debounceTimeout);
      });
    } else {
      res = this.processSynchAction(name, action, args);
    }

    return res;
  };

  private processNextConflictAction(name: string) {
    const futureActions = this.conflictActions[name];

    if (futureActions && futureActions.length > 0) {
      const futureAction = this.conflictActions[name].shift();

      if (futureAction) {
        const p = this.actions[name](...futureAction.args) as Promise<any>;
        if (p == null) {
          this.processNextConflictAction(name);
        } else {
          p.then(futureAction.resolve).catch((e) => futureAction.reject(e));
        } // else aborted
      }
    }
  }

  private markActionAsLoading(name: string, conflictPolicy: ConflictPolicy, promiseId: string) {
    if (conflictPolicy === ConflictPolicy.PARALLEL) {
      let v = this.loadingMap[name];
      if (!v) {
        v = { [promiseId]: true };
      } else {
        v[promiseId] = true;
      }

      this.loadingMap[name] = v;
    } else {
      this.loadingMap[name] = true;
    }
  }

  private markActionAsLoaded = (name: string, conflictPolicy: ConflictPolicy, promiseId: string) => {
    if (conflictPolicy === ConflictPolicy.PARALLEL) {
      const v = this.loadingMap[name];
      delete v[promiseId];
      if (Object.keys(v).length === 0) {
        this.loadingMap[name] = false;
      }
    } else {
      this.loadingMap[name] = false;
    }
  };

  private getDecoratedAsynchAction = (
    name,
    {
      promise,
      reducer,
      errorReducer,
      onDone,
      preReducer,
      optimisticReducer,
      successMessage,
      errorMessage,
      getErrorMessage,
      getSuccessMessage,
      conflictPolicy = ConflictPolicy.KEEP_ALL,
      rejectPromiseOnError,
      getPromiseId = () => {
        throw new Error(
          'If conflict policy is set to ConflictPolicy.PARALLEL, getPromiseId must be set and returns a string.'
        );
      },
      retryCount,
      retryDelaySeed,
      isTriggerRetryError,
    }: AsynchActionPromise<S, any, A, P>
  ) => (...args: Parameters<A[string]>) => {
    const dataState = this.dataState;

    const { logEnabled, notifySuccess: _notifySuccess, notifyError: _notifyError, props } = this.props;

    const notifyError = _notifyError || (props && props['notifyError']);
    const notifySuccess = _notifySuccess || (props && props['notifySuccess']);

    if (conflictPolicy !== ConflictPolicy.PARALLEL && this.promises[name]) {
      return this.handleConflictingAction(name, conflictPolicy, args);
    }

    const loadingState: Partial<StateDecoratorState<S, A>> = {};

    const isSomeRequestLoadingBefore = this.isSomeRequestLoading();

    const isParallelActions = conflictPolicy === ConflictPolicy.PARALLEL;

    const promiseId = isParallelActions && getPromiseId(...args);

    this.markActionAsLoading(name, conflictPolicy, promiseId);

    if (preReducer) {
      const newDataState = preReducer(dataState, args, props);
      if (newDataState !== null) {
        loadingState.data = newDataState;
        this.dataState = newDataState;
        logStateChange(name, logEnabled, dataState, newDataState, args, 'pre reducer');
      }
    }

    if (optimisticReducer) {
      const newDataState = optimisticReducer(loadingState.data || dataState, args, props);
      if (newDataState !== null) {
        loadingState.data = newDataState;
        this.dataState = newDataState;
        this.optimisticActions[name] = true;
        this.shouldRecordHistory = true;
        this.pushActionToHistory(
          name,
          'optimisticReducer',
          [StateDecorator.clone(args), StateDecorator.clone(props)],
          StateDecorator.clone(dataState)
        );

        // During optimistic request, we do not want to see the loading state.
        // However, the loading state is available in the loading map.
        loadingState.loading = isSomeRequestLoadingBefore;

        logStateChange(name, logEnabled, loadingState.data || dataState, newDataState, args, 'Optimistic reducer');
      }
    } else {
      loadingState.loading = true;
    }

    this.setState(loadingState);

    if (conflictPolicy === ConflictPolicy.PARALLEL) {
      this.forceUpdate();
    }

    let p = retryDecorator(promise, retryCount ? 1 + retryCount : 1, retryDelaySeed, isTriggerRetryError)(
      args,
      this.dataState,
      props,
      this.actions
    );

    if (p === null) {
      logSingle(name, args, logEnabled, 'ABORTED');
      this.markActionAsLoaded(name, conflictPolicy, promiseId);

      return null; // nothing to do
    }

    p = p
      .then((result) => {
        // Need to get the data here because when chaining action the above variable is NOT up to date.
        const dataState = this.dataState;

        const promiseId = isParallelActions && getPromiseId(...args);
        this.markActionAsLoaded(name, conflictPolicy, promiseId);

        const newState: Partial<StateDecoratorState<S, A>> = {
          loading: this.isSomeRequestLoading(),
        };

        if (reducer) {
          const newDataState = reducer(dataState, result, args, props);

          if (newDataState !== null) {
            this.pushActionToHistory(name, 'reducer', [result, args, props]);

            newState.data = newDataState;
            this.dataState = newState.data;

            logStateChange(name, logEnabled, dataState, newState.data, args, 'reducer');
          }
        } else if (!optimisticReducer) {
          logSingle(name, args, logEnabled, 'NO REDUCER');
        }

        if (notifySuccess && (successMessage !== undefined || getSuccessMessage !== undefined)) {
          let msg: string;

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
          onDone(newState.data || dataState, result, args, props, this.actions);
        }

        delete this.promises[name];
        this.setState(newState);

        this.processNextConflictAction(name);

        return Promise.resolve(result);
      })
      .catch((error) => {
        const dataState = this.dataState;

        const promiseId = isParallelActions && getPromiseId(...args);
        this.markActionAsLoaded(name, conflictPolicy, promiseId);

        const newState: Partial<StateDecoratorState<S, A>> = {
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

        StateDecorator.onAsyncError(error, errorHandled);

        logStateChange(name, logEnabled, dataState, newState.data, args, 'Error reducer', true);

        const result = !errorHandled || rejectPromiseOnError ? Promise.reject(error) : undefined;

        delete this.promises[name];

        this.setState(newState);

        this.processNextConflictAction(name);

        return result;
      });

    this.promises[name] = {
      promise: p,
      refArgs: conflictPolicy === ConflictPolicy.REUSE && args.length > 0 ? [...args] : [],
    };

    return p;
  };

  setState(newState: any, cb = null) {
    if (this.mounted !== false || IS_JEST_ENV) {
      super.setState(newState, cb);
    }
  }

  private computeLoadingMap() {
    return Object.keys(this.loadingMap).reduce(
      (acc, name) => {
        const rawAction = this.props.actions[name];
        const v = this.loadingMap[name];
        let res: boolean | undefined = false;
        if (isAsyncAction(rawAction)) {
          if (rawAction.conflictPolicy === ConflictPolicy.PARALLEL) {
            res = v !== undefined && Object.keys(v).length > 0;
          } else {
            res = v as boolean;
          }
        } else {
          res = v as boolean;
        }
        acc[name as keyof A] = res;
        return acc;
      },
      {} as LoadingMap<A>
    );
  }

  private computeParallelLoadingMap() {
    if (!this.hasParallelActions) {
      return {} as LoadingMapParallelActions<A>;
    }
    return Object.keys(this.loadingMap).reduce(
      (acc, name) => {
        const rawAction = this.props.actions[name];
        if (isAsyncAction(rawAction)) {
          if (rawAction.conflictPolicy === ConflictPolicy.PARALLEL) {
            if (this.loadingMap[name] === undefined) {
              acc[name as keyof A] = {};
            } else {
              acc[name as keyof A] = this.loadingMap[name] as PromiseIdMap;
            }
          }
        }
        return acc;
      },
      {} as LoadingMapParallelActions<A>
    );
  }

  /**
   * The decorated action, passed the children render function
   */
  private actions: A = this.decorateActions(this.props.actions);

  state = {
    data: this.props.initialState === undefined ? undefined : this.props.initialState,
    loading: false,
    refValues: this.props.getPropsRefValues && this.props.props && this.props.getPropsRefValues(this.props.props),
    actions: this.actions,
  };

  render() {
    const { children } = this.props;
    const { loading, data } = this.state;

    // getDerivedStateFromProps
    if (data !== this.dataState) {
      this.dataState = data;
    }

    return children
      ? children(this.dataState, this.actions, loading, this.computeLoadingMap(), this.computeParallelLoadingMap())
      : '';
  }
}

type ExtraProps<S, A extends DecoratedActions, P> = Pick<
  StateDecoratorProps<S, A, P>,
  | 'getPropsRefValues'
  | 'onPropsChangeReducer'
  | 'onPropsChange'
  | 'notifySuccess'
  | 'notifyError'
  | 'onMount'
  | 'logEnabled'
>;

function getDisplayName(WrappedComponent: React.ComponentType<any>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

/**
 * HOC to inject the props, state, actions and loading props to a presentation component.
 * S: State type.
 * A: Actions type.
 * P: Props type of the component.
 * @param getInitialState A function that provides the initial
 * @param actions The map of actions
 * @param options Options to configure the state decorator
 */
export function injectState<S, A extends DecoratedActions, P = {}>(
  getInitialState: (p: P) => S,
  actions: StateDecoratorActions<S, A, P>,
  options: ExtraProps<S, A, P> = {}
) {
  return (WrappedComponent: React.ComponentType<P & S & A & Partial<LoadingProps<A>>>) =>
    class HOC extends React.PureComponent<P> {
      static displayName = `injectState(${getDisplayName(WrappedComponent)})`;
      render() {
        return (
          <StateDecorator {...options} initialState={getInitialState(this.props)} actions={actions} props={this.props}>
            {(state, actions, loading, loadingMap, loadingParallel) => (
              <WrappedComponent
                {...state}
                {...actions}
                {...this.props}
                loading={loading}
                loadingMap={loadingMap}
                loadingParallelMap={loadingParallel}
              />
            )}
          </StateDecorator>
        );
      }
    } as React.ComponentClass<P>;
}
