import React from 'react';
import useStateDecorator, { StateDecoratorActions, LoadingProps } from '../../../src';

type Item = {
  id: string;
};

type State = {
  list: Item[];
};

type Actions = {
  loadList: () => Promise<Item[]>;
  addItem: (item: Item) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
};

export type Props = {};

export const getInitialState = (p: Props) => ({ list: [] });

export const actionsImpl: StateDecoratorActions<State, Actions, Props> = {
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

const MyView = (props: State & Actions & LoadingProps<Actions>) => <div />;

export default function MyContainer(props: Props) {
  const { state, actions, ...loadingProps } = useStateDecorator(getInitialState, actionsImpl, props);
  return <MyView {...state} {...actions} {...loadingProps} />;
}
