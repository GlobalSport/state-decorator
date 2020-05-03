import React from 'react';
import useStateDecorator, { StateDecoratorActions, LoadingProps, ConflictPolicy } from '../../../src';
import { AbortActionCallback } from '../../../src/types';

export type AbortProps = {};

export type AbortState = {
  isAborted: boolean;
  isSuccess: boolean;
  isError: boolean;
};

export type AbortActions = {
  onAction: (willCrash: boolean) => Promise<string>;
};

type Props = AbortProps;
type State = AbortState;
type Actions = AbortActions;

export type AbortViewProps = Props &
  Actions &
  State &
  Pick<LoadingProps<Actions>, 'loadingMap'> & { abortAction: AbortActionCallback<Actions> };

export function getInitialState(p: Props): State {
  return {
    isAborted: false,
    isSuccess: false,
    isError: false,
  };
}

export const actionsAbort: StateDecoratorActions<State, Actions, Props> = {
  onAction: {
    conflictPolicy: ConflictPolicy.IGNORE,
    abortable: true,
    preReducer: () => ({ isError: false, isSuccess: false, isAborted: false }),
    promise: ([willCrash], s, p, a, abortSignal) =>
      new Promise((resolve, reject) => {
        const timeout = window.setTimeout(willCrash ? reject : resolve, 2500, willCrash ? new Error('boom') : 'result');
        abortSignal.addEventListener('abort', () => {
          window.clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    errorReducer: (s, e) => (e.name === 'AbortError' ? { ...s, isAborted: true } : { ...s, isError: true }),
    reducer: (s) => ({ ...s, isSuccess: true }),
    onFail: (s, e) => {
      if (e.name === 'AbortError') {
        console.log('AbortError side effect');
      } else {
        console.log('Other error side effect');
      }
    },
  },
};

export function onMount(actions: Actions, p: Props) {}

export const AbortView = React.memo(function AbortView(p: AbortViewProps) {
  return (
    <div>
      <h3>Abort asynchronous action</h3>
      <div>
        <button onClick={() => p.onAction(false)}>Start</button>
        <button onClick={() => p.onAction(true)}>Start & crash</button>
        <button onClick={() => p.abortAction('onAction')}>Abort</button>
        {p.loadingMap.onAction && <span>Loading...</span>}
      </div>
      <div>
        {p.isAborted && <div>Aborted!</div>}
        {p.isError && <div>Error!</div>}
        {p.isSuccess && <div>Success!</div>}
      </div>
    </div>
  );
});

export default React.memo(function Abort(p: AbortProps) {
  const { state: s, actions: a, loadingMap, abortAction } = useStateDecorator(getInitialState, actionsAbort, p, {
    onMount,
  });
  return <AbortView {...p} {...s} {...a} loadingMap={loadingMap} abortAction={abortAction} />;
});
