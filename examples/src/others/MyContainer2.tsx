import React from 'react';
import StateDecorator, { StateDecoratorActions, LoadingProps } from '../../../src/StateDecorator';

type Item = {
  id: string;
};

type State = {
  list: Item[];
};

type Actions = {
  loadList: () => Promise<Item[]>;
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
};

type Props = {};

function getInitialState(): State {
  return {
    list: [],
  };
}

const actions: StateDecoratorActions<State, Actions, Props> = {
  loadList: {
    promise: () => new Promise((_, reject) => setTimeout(reject, 500, new Error('Too bad'))),
    reducer: (state, list: Item[]): State => ({ ...state, list }),
  },
  addItem: {
    promise: ([item]) => Promise.resolve(),
    optimisticReducer: (s, [item]: Item[]): State => ({ ...s, list: [...s.list, item] }),
  },
  removeItem: {
    promise: ([id]) => Promise.resolve(),
    optimisticReducer: (s, [id]): State => ({ ...s, list: s.list.filter((i) => i.id !== id) }),
  },
};

export function MyContainer() {
  return (
    <StateDecorator<State, Actions> actions={actions} getInitialState={getInitialState}>
      {(state, actions, loading) => <MyView {...state} {...actions} loading={loading} />}
    </StateDecorator>
  );
}

const MyView = (p: State & Actions & Pick<LoadingProps<Actions>, 'loading'>) => <div />;
