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

const ReuseConflictPolicy = () => {
  const classes = useCommonStyles();

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
        <div style={{ border: '1px solid grey', marginBottom: 10 }}>
          <h3>Reuse</h3>
          <p>Returns the current promise, if any, or create a new promise.</p>
          <p>The buttons triggers an action that takes 3 seconds to return.</p>
          <Button className={classes.button} onClick={() => actions.getData()}>
            Get Data
          </Button>
          <div>{loading ? 'loading...' : ''}</div>
          <div>Counter: {counter}</div>
        </div>
      )}
    </StateDecorator>
  );
};

export default ReuseConflictPolicy;
