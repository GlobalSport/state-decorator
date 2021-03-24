import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';
import { ConflictPolicy } from '../../../src/types';

export type State = {
  counter: number;
};

export type Actions = {
  getData: (id: string) => Promise<string>;
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
            <p>If a call to this action is ongoing with same parameters, reuse the promise.</p>
            <p>Otherwise, use KEEP_ALL policy and queue the action calls.</p>
            <p>The buttons triggers an action that takes 3 seconds to return.</p>
            <p>
              Usage: shared state / action used in different components that call this action at initialization time.
            </p>
            <button onClick={() => actions.getData('1')}>Get Data ID 1</button>
            <button onClick={() => actions.getData('2')}>Get Data ID 2</button>
            <div>{loading ? 'loading...' : ''}</div>
            <div>Counter: {counter}</div>
          </div>
        )}
      </StateDecorator>
    );
  }
}
