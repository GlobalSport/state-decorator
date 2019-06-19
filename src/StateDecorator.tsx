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
import {
  DecoratedActions,
  LoadingMap,
  LoadingMapParallelActions,
  LoadingProps,
  StateDecoratorActions,
  ConflictPolicy,
} from './types';
import { useOnMount, useOnUnmount, useOnUnload } from './hooks';
import useStateDecorator, { setCloneFunction, setOnAsyncError, SetIsTriggerRetryError } from './useStateDecorator';
import { testSyncAction, testAsyncAction, testAdvancedSyncAction } from './base';

export {
  StateDecoratorActions,
  ConflictPolicy,
  LoadingProps,
  useStateDecorator,
  useOnMount,
  useOnUnmount,
  useOnUnload,
  testSyncAction,
  testAsyncAction,
  testAdvancedSyncAction,
  setCloneFunction,
  setOnAsyncError,
  SetIsTriggerRetryError,
};

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
   * List of action names that are marked as loading at initial time.
   * As a render is done before first actions can be trigerred, some actions can be marked as loading at
   * initial time.
   */
  initialActionsMarkedLoading?: string[];

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
  getPropsRefValues?: (props: P) => any[];

  /**
   * Triggered when values of reference from props have changed. Allow to update state after a prop change.
   * <b>null</b> means no change.
   */
  onPropsChangeReducer?: (s: S, newProps: P, updatedIndices: number[]) => S;

  /**
   * Triggered when values of reference from props have changed. Allow to call actions after a prop change.
   */
  onPropsChange?: (s: S, newProps: P, actions: A, updatedIndices: number[]) => void;

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

/**
 * A state container to manage complex states.
 * Types:
 *   - S: The interface of the State to manange.
 *   - A: The interface of the Actions to pass to the child component.
 *
 * Input: an object that contains synchronous action and/or asynchronous actions
 *
 * The child of this component is a function with the action, current state and aynchronous action related properties.
 */
const StateDecorator = function StateDecorator<S, A extends DecoratedActions, P = {}>(
  props: StateDecoratorProps<S, A, P>
) {
  const {
    initialState,
    actions,
    initialActionsMarkedLoading,
    logEnabled,
    getPropsRefValues,
    onPropsChange,
    onPropsChangeReducer,
    notifySuccess,
    notifyError,
  } = props;

  useOnMount(() => props.onMount && props.onMount(decoratedActions, props.props));

  useOnUnmount(() => props.onUnmount && props.onUnmount(state, props.props));

  useOnUnload(() => props.onUnload && props.onUnload(state, props.props));

  const { state, actions: decoratedActions, loading, loadingMap, loadingParallelMap } = useStateDecorator(
    () => initialState,
    actions,
    props.props,
    {
      initialActionsMarkedLoading,
      logEnabled,
      getPropsRefValues,
      notifySuccess,
      notifyError,
      onPropsChange,
      onPropsChangeReducer,
    }
  );

  return (
    <React.Fragment>{props.children(state, decoratedActions, loading, loadingMap, loadingParallelMap)}</React.Fragment>
  );
};

type ExtraProps<S, A extends DecoratedActions, P> = Pick<
  StateDecoratorProps<S, A, P>,
  | 'getPropsRefValues'
  | 'onPropsChangeReducer'
  | 'onPropsChange'
  | 'notifySuccess'
  | 'notifyError'
  | 'onMount'
  | 'onUnmount'
  | 'onUnload'
  | 'logEnabled'
  | 'initialActionsMarkedLoading'
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

// `React.memo return type is meddling with generic types
export default React.memo(StateDecorator) as typeof StateDecorator;
