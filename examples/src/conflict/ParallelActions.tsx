import React from 'react';
import produce from 'immer';
import useStateDecorator, { StateDecoratorActions, ConflictPolicy, LoadingProps } from '../../../src';
import { AbortActionCallback } from '../../../src/types';
import { useState } from 'react';
import { useEffect } from 'react';

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

type ParallelActionViewProps = State &
  Actions &
  Pick<LoadingProps<Actions>, 'loadingParallelMap'> & { abortAction: AbortActionCallback<Actions> };

type ItemViewProps = {
  item: Item;
  isItemLoading: boolean;
} & Pick<ParallelActionViewProps, 'abortAction' | 'onChange'>;

function ItemView(p: ItemViewProps) {
  const [value, setValue] = useState(p.item.value);
  const { item, isItemLoading } = p;

  useEffect(() => {
    setValue(item.value);
  }, [item]);

  return (
    <div key={item.id}>
      {item.id}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => p.onChange(item.id, e.target.value)}
        disabled={isItemLoading}
        style={{ backgroundColor: isItemLoading ? 'grey' : null }}
      />
      <button onClick={() => p.abortAction('onChange', item.id)}>Abort</button>
    </div>
  );
}

const ParallelActionsView = (props: ParallelActionViewProps) => {
  const { items, loadingParallelMap, onChange } = props;
  return (
    <div style={{ border: '1px solid grey', marginBottom: 10 }}>
      <h2>Parallel actions</h2>
      <p>Actions are launched on blur, in parallel for 3s</p>
      {items.map((item) => {
        const isItemLoading = loadingParallelMap.onChange[item.id];
        return (
          <ItemView
            key={item.id}
            isItemLoading={isItemLoading}
            item={item}
            onChange={onChange}
            abortAction={props.abortAction}
          />
        );
      })}
    </div>
  );
};

const actionsImpl: StateDecoratorActions<State, Actions> = {
  onChange: {
    abortable: true,
    preReducer: (s, [id, value]) =>
      produce(s, ({ items }) => {
        items.find((i) => i.id === id).value = `${value}*`;
      }),
    promise: ([id, value], s, p, a, abortSignal) =>
      new Promise((resolve, reject) => {
        const timeout = window.setTimeout(resolve, 10000, value);
        abortSignal.addEventListener('abort', () => {
          window.clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    conflictPolicy: ConflictPolicy.PARALLEL,
    getPromiseId: (id) => id,
    reducer: (s, value, [id]) =>
      produce(s, ({ items }) => {
        items.find((i) => i.id === id).value = value;
      }),
  },
};

export default function ParallelActions() {
  const { state, actions, loadingParallelMap, abortAction } = useStateDecorator(
    getInitialState,
    actionsImpl,
    {},
    { logEnabled: true }
  );
  return (
    <ParallelActionsView {...state} {...actions} loadingParallelMap={loadingParallelMap} abortAction={abortAction} />
  );
}
