import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';

export type State = {
  count: number;
};

export type Actions = {
  action: () => Promise<any>;
};

export const getInitialState = (): State => ({
  count: 0,
});

let retry = 0;

export default class Retry extends React.PureComponent<{}> {
  state = {
    messages: [],
  };

  addToLog = (message) => {
    this.setState({ messages: [...this.state.messages, message] });
  };

  actions: StateDecoratorActions<State, Actions> = {
    action: {
      promise: () =>
        new Promise((resolve, reject) => {
          retry++;
          if (retry <= 3) {
            // simulate failed to fetch
            this.addToLog('Action failed, will retry');
            return reject(new TypeError());
          }
          this.addToLog('Action succeeded!');
          return resolve('OK');
        }),
      reducer: (s) => ({
        ...s,
        count: s.count + 1,
      }),
      retryCount: 5,
      retryDelaySeed: 2000,
    },
  };

  render() {
    return (
      <StateDecorator<State, Actions> actions={this.actions} initialState={getInitialState()}>
        {({ count }, { action }) => (
          <div>
            <h1>Retry</h1>
            <div># of calls to promise: {retry}</div>
            <div># of calls to reducer: {count}</div>
            <div>
              <textarea
                value={this.state.messages.join('\n')}
                onChange={() => {}}
                style={{ height: 100, width: 200 }}
              />
            </div>
            <button onClick={action}>Trigger action</button>
          </div>
        )}
      </StateDecorator>
    );
  }
}
