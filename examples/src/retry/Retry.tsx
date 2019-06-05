import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';
import useCommonStyles from '../style.js';
import TextField from '@material-ui/core/TextField';
import { Button } from '@material-ui/core';

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

export const RetryView = React.memo(function RetryView(
  props: State & Pick<Actions, 'action'> & { messages: string[] }
) {
  const { action, count, messages } = props;
  const commonClasses = useCommonStyles();
  return (
    <div className={commonClasses.smallCardContainer}>
      <div># of calls to promise: {retry}</div>
      <div># of calls to reducer: {count}</div>
      <br />
      <Button className={commonClasses.button} onClick={action}>
        Trigger action
      </Button>
      <div className={commonClasses.smallCardValue}>
        <TextField
          multiline
          variant="outlined"
          value={messages.join('\n')}
          rows="4"
          onChange={() => {}}
          style={{ width: 300 }}
        />
      </div>
    </div>
  );
});

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
        {({ count }, { action }) => <RetryView action={action} count={count} messages={this.state.messages} />}
      </StateDecorator>
    );
  }
}
