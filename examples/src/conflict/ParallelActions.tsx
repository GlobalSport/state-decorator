import React from 'react';
import produce from 'immer';
import useStateDecorator, { StateDecoratorActions, ConflictPolicy, LoadingProps } from '../../../src';

type Item = {
  id: string;
  value: string;
};

export type State = {
  items: Item[];
};

export type Actions = {
  onChange: (id: string, value: string) => Promise<string>;
};

export const getInitialState = (): State => ({
  items: [
    {
      id: 'user1',
      value: '',
    },
    {
      id: 'user2',
      value: '',
    },
    {
      id: 'user3',
      value: '',
    },
    {
      id: 'user4',
      value: '',
    },
  ],
});

const ParallelActionsView = (props: State & Actions & LoadingProps<Actions>) => {
  const { items, loadingParallelMap, onChange } = props;
  return (
    <div style={{ border: '1px solid grey', marginBottom: 10 }}>
      <h2>Parallel actions</h2>
      <p>Actions are launched on blur, in parallel for 3s</p>
      {items.map((item) => {
        const isItemLoading = loadingParallelMap.onChange[item.id];
        return (
          <div key={item.id}>
            {item.id}
            <input
              onBlur={(e) => onChange(item.id, e.target.value)}
              disabled={isItemLoading}
              style={{ backgroundColor: isItemLoading ? 'grey' : null }}
            />
          </div>
        );
      })}
    </div>
  );
};

const actionsImpl: StateDecoratorActions<State, Actions> = {
  onChange: {
    promise: ([id, value]) => new Promise((res) => setTimeout(res, 3000, value)),
    conflictPolicy: ConflictPolicy.PARALLEL,
    getPromiseId: (id) => id,
    reducer: (s, value, [id]) =>
      produce(s, ({ items }) => {
        items.find((i) => i.id === id).value = value;
      }),
  },
};

export default function ParallelActions() {
  const { state, actions, ...loadingProps } = useStateDecorator(getInitialState, actionsImpl);
  return <ParallelActionsView {...state} {...actions} {...loadingProps} />;
}
