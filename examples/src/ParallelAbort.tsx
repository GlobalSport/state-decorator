import React from 'react';
import useLocalStore, { StoreActions, AbortActionCallback, ConflictPolicy } from '../../lib/es';

import { Status } from './types';
import ParallelAbortView from './ParallelAbortView';

export type Item = {
  id: string;
  value: string;
  status: Status;
};

type State = {
  items: {
    [id: string]: Item;
  };
};

type Actions = {
  onSaveItem: (id: string, value: string) => Promise<string>;
};

export type ParallelAbortViewProps = State &
  Actions & {
    abortAction: AbortActionCallback<Actions>;
  };

// Initial state

export const getInitialState = (): State => ({
  items: ['item1', 'item2', 'item3', 'item4'].reduce((acc, id) => {
    acc[id] = {
      id,
      value: '',
      status: 'paused',
    };
    return acc;
  }, {} as State['items']),
});

function updateState(state: State, id: string, value: string | undefined, status: Status | undefined): State {
  const item = state.items[id] ?? null;
  const v = value ?? item?.value ?? '';
  const s = status ?? item?.status ?? 'paused';

  return {
    ...state,
    items: {
      ...state.items,
      [id]: {
        ...item,
        value: v,
        status: s,
      },
    },
  };
}

const parallelAbortActions: StoreActions<State, Actions> = {
  onSaveItem: {
    abortable: true,
    conflictPolicy: ConflictPolicy.PARALLEL,
    getPromiseId: (id) => id,
    preEffects: ({ s, args: [id] }) => updateState(s, id, undefined, 'running'),
    getPromise: ({ args: [id, value], abortSignal }) =>
      new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(resolve, 5000, value);
        abortSignal.addEventListener('abort', () => {
          window.clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    errorEffects: ({ s, err, args: [id] }) =>
      updateState(s, id, undefined, err.name === 'AbortError' ? 'aborted' : 'errored'),
    effects: ({ s, res, args: [id] }) => updateState(s, id, res, 'succeeded'),
  },
};

export default function ParallelActions() {
  const { state, actions, abortAction } = useLocalStore(getInitialState, parallelAbortActions);
  return <ParallelAbortView {...state} {...actions} abortAction={abortAction} />;
}
