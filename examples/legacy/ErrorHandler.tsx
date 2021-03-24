import React from 'react';
import useStateDecorator, { StateDecoratorActions, LoadingProps, setOnAsyncError } from '../../src';

export type ErrorHandlerProps = {};

export type ErrorHandlerState = {
  value: string;
};

export type ErrorHandlerActions = {
  setValue: (arg1: string, arg2: string) => void;
};

type Props = ErrorHandlerProps;
type State = ErrorHandlerState;
type Actions = ErrorHandlerActions;

type ViewProps = Props & Actions & State & Pick<LoadingProps<Actions>, 'loadingMap'>;

export function getInitialState(p: ErrorHandlerProps): State {
  return {
    value: 'initial value',
  };
}

export const ErrorHandlerView = React.memo(function ErrorHandlerView(p: ViewProps) {
  return <button onClick={() => p.setValue('error', 'error2')}>Send error request</button>;
});

export const actionsErrorHandler: StateDecoratorActions<State, Actions, Props> = {
  setValue: {
    promise: () => new Promise((res, rej) => setTimeout(() => rej(new Error('Boom!')), 500)),
    errorMessage: 'error...',
  },
};

/**
 * Global asynchronous actions error hander
 */
function onAsyncError(error: any, isHandled: boolean, state: any, props: any, actionName: string, args: any[]) {
  if (error && error.name != 'AbortError') {
    console.error(error);
    console.error('state:', state);
    console.error('props:', props);
    console.error('action:', actionName);
    console.error('args:', args);
  }
}

export function onMount(actions: ErrorHandlerActions) {
  setOnAsyncError(onAsyncError);
}

export default React.memo(function ErrorHandler(p: ErrorHandlerProps) {
  const { state: s, actions: a, loadingMap } = useStateDecorator(getInitialState, actionsErrorHandler, p, {
    onMount,
    notifyError: () => {},
  });
  return <ErrorHandlerView {...p} {...s} {...a} loadingMap={loadingMap} />;
});
