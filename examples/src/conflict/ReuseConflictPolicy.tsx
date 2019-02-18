import React from 'react';
import StateDecorator, { StateDecoratorActions, ConflictPolicy } from '../../../src/StateDecorator';

export type State = {
  counter: number;
};

export type Actions = {
  getData: () => Promise<string>;
};

export const getInitialState = (): State => ({
  counter: 0,
});

export default class ReuseConflictPolicy extends React.PureComponent {
  actions: StateDecoratorActions<State, Actions> = {
    getData: {
      promise: () => new Promise((res) => setTimeout(res, 3000)),
      reducer: (s) => ({ ...s, counter: s.counter + 1 }),
      conflictPolicy: ConflictPolicy.REUSE,
    },
  };
  render() {
    return (
      <StateDecorator<State, Actions> actions={this.actions} initialState={getInitialState()}>
        {({ counter }, actions, loading) => (
          <div style={{ border: '1px solid grey', marginBottom: 10 }}>
            <h3>Reuse</h3>
            <p>Returns the current promise, if any, or create a new promise.</p>
            <p>The buttons triggers an action that takes 3 seconds to return.</p>
            <button onClick={() => actions.getData()}>Get Data</button>
            <div>{loading ? 'loading...' : ''}</div>
            <div>Counter: {counter}</div>
          </div>
        )}
      </StateDecorator>
    );
  }
}
