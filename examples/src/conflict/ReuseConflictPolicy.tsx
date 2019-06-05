import React from 'react';
import StateDecorator, { StateDecoratorActions, ConflictPolicy } from '../../../src/StateDecorator';
import { Button } from '@material-ui/core';
import useCommonStyles from '../style.js';

export type State = {
  counter: number;
};

export type Actions = {
  getData: () => Promise<string>;
};

export const getInitialState = (): State => ({
  counter: 0,
});

const ReuseConflictPolicy = React.memo(function ReuseConflictPolicy() {
  const commonClasses = useCommonStyles();

  const actions: StateDecoratorActions<State, Actions> = {
    getData: {
      promise: () => new Promise((res) => setTimeout(res, 3000)),
      reducer: (s) => ({ ...s, counter: s.counter + 1 }),
      conflictPolicy: ConflictPolicy.REUSE,
    },
  };
  return (
    <StateDecorator<State, Actions> actions={actions} initialState={getInitialState()}>
      {({ counter }, actions, loading) => (
        <div className={commonClasses.smallCardContainer}>
          <Button className={commonClasses.button} onClick={() => actions.getData()}>
            Get Data
          </Button>
          <div className={commonClasses.smallCardValue}>{loading ? 'loading...' : ''}</div>
          <div className={commonClasses.smallCardValue}>Counter: {counter}</div>
        </div>
      )}
    </StateDecorator>
  );
});

export default ReuseConflictPolicy;
