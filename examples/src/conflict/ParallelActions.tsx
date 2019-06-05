import React from 'react';
import StateDecorator, { StateDecoratorActions, ConflictPolicy } from '../../../src/StateDecorator';
import produce from 'immer';
import { TextField, CircularProgress } from '@material-ui/core';
import green from '@material-ui/core/colors/green';
import { makeStyles } from '@material-ui/styles';

const useLocalStyle = makeStyles({
  buttonProgress: {
    color: green[500],
    position: 'absolute',
    top: '5px',
    left: 'calc(100% + 15px)',
  },
  container: {
    width: '75%',
    margin: '0 auto',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  label: {
    marginRight: '20px',
  },
});

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

const ParallelActionsView = React.memo(function ParallelActionsView(props: State & Actions & { loadingParallelMap }) {
  const { items, onChange, loadingParallelMap } = props;
  const localClasses = useLocalStyle();

  return (
    <div className={localClasses.container}>
      {items.map((item) => {
        const isItemLoading = loadingParallelMap.onChange[item.id];
        return (
          <div className={localClasses.item} key={item.id}>
            <label className={localClasses.label}>{item.id}</label>
            <TextField
              placeholder="Write here"
              onBlur={(e) => onChange(item.id, e.target.value)}
              disabled={isItemLoading}
              style={{ flex: 1 }}
            />
            {isItemLoading && <CircularProgress size={25} className={localClasses.buttonProgress} />}
          </div>
        );
      })}
    </div>
  );
});

const ParallelActions = () => {
  const actions: StateDecoratorActions<State, Actions> = {
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

  return (
    <StateDecorator actions={actions} initialState={getInitialState()}>
      {({ items }, { onChange }, loading, loadingMap, loadingParallelMap) => (
        <ParallelActionsView items={items} onChange={onChange} loadingParallelMap={loadingParallelMap} />
      )}
    </StateDecorator>
  );
};

export default ParallelActions;
