import React from 'react';
import useStateDecorator, { StateDecoratorActions, LoadingProps, ConflictPolicy } from '../../../src';
import { AbortActionCallback } from '../../../src/types';

import { Status } from '../types';
export type AbortProps = {};

export type AbortState = {
  status: Status;
};

export type AbortActions = {
  onAction: (willCrash: boolean) => Promise<string>;
};

type Props = AbortProps;
type State = AbortState;
type Actions = AbortActions;

export type AbortViewProps = Props &
  Actions &
  State & {
    abortAction: AbortActionCallback<Actions>;
  };

export function getInitialState(p: Props): State {
  return {
    status: 'paused',
  };
}

export const actionsAbort: StateDecoratorActions<State, Actions, Props> = {
  onAction: {
    conflictPolicy: ConflictPolicy.IGNORE,
    abortable: true,
    preReducer: () => ({ status: 'running' }),
    promise: ([willCrash], s, p, a, abortSignal) =>
      new Promise((resolve, reject) => {
        const timeout = window.setTimeout(willCrash ? reject : resolve, 5000, willCrash ? new Error('boom') : 'result');
        abortSignal.addEventListener('abort', () => {
          window.clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    errorReducer: (s, e) => (e.name === 'AbortError' ? { status: 'aborted' } : { status: 'errored' }),
    reducer: (s) => ({ ...s, status: 'succeeded' }),
    onFail: (s, e) => {
      if (e.name === 'AbortError') {
        console.log('AbortError side effect');
      } else {
        console.log('Other error side effect');
      }
    },
  },
};

export default React.memo(function Abort() {
  const { state: s, actions: a, abortAction } = useStateDecorator(getInitialState, actionsAbort);

  return <AbortView status={s.status} onAction={a.onAction} abortAction={abortAction} />;
});

export const AbortView = React.memo(function AbortView(p: AbortViewProps) {
  return (
    <div>
      <h3>Abort asynchronous action</h3>
      <div>
        <button onClick={() => p.onAction(false)}>Start</button>
        <button onClick={() => p.onAction(true)}>Start & crash</button>
        <button onClick={() => p.abortAction('onAction')}>Abort</button>
      </div>
      <div>{p.status}</div>
    </div>
  );
});
