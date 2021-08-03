import React from 'react';
import useLocalStore, { StoreActions, ConflictPolicy, AbortActionCallback, IsLoadingFunc } from '../../dist/index';
import ParallelView from './ParallelView';

export type Item = {
  id: string;
  value: string;
};

type State = {
  items: {
    [id: string]: Item;
  };
};

type Actions = {
  onSaveItem: (id: string, value: string) => Promise<string>;
};

export type ParallelViewProps = State &
  Actions & {
    isLoading: IsLoadingFunc<Actions>;
    abortAction: AbortActionCallback<Actions>;
  };

// Initial state

export const getInitialState = (): State => ({
  items: ['item1', 'item2', 'item3', 'item4'].reduce((acc, id) => {
    acc[id] = {
      id,
      value: '',
    };
    return acc;
  }, {} as State['items']),
});

function updateState(state: State, id: string, value: string | undefined): State {
  const item = state.items[id];
  const v = value ?? item?.value ?? '';

  return {
    ...state,
    items: {
      ...state.items,
      [id]: {
        ...item,
        value: v,
      },
    },
  };
}

const parallelAbortActions: StoreActions<State, Actions> = {
  onSaveItem: {
    conflictPolicy: ConflictPolicy.PARALLEL,
    getPromiseId: (id) => id,
    getPromise: ({ args: [, value] }) =>
      new Promise((resolve) => {
        window.setTimeout(resolve, 3000, value);
      }),
    effects: ({ s, result, promiseId }) => updateState(s, promiseId, result),
  },
};

export default function Parallel() {
  const { state, actions, isLoading, abortAction } = useLocalStore(getInitialState, parallelAbortActions);
  return <ParallelView {...state} {...actions} isLoading={isLoading} abortAction={abortAction} />;
}
