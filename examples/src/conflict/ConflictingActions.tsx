import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';
import ParallelActions from './ParallelActions';
import ReuseConflictPolicy from './ReuseConflictPolicy';
import { ConflictPolicy } from '../../../src/types';

export type State = {
  counter: number;
  text: string;
};

export type Actions = {
  updateText: (text: string) => Promise<string>;
};

export const getInitialState = (): State => ({
  counter: 0,
  text: '',
});

export interface Props {
  title: string;
  description: string;
  conflictPolicy: ConflictPolicy;
}

class ConflictingActionsContainer extends React.PureComponent<Props> {
  actions: StateDecoratorActions<State, Actions> = {
    updateText: {
      promise: ([text]) => new Promise((res) => setTimeout(res, 1000, text)),
      reducer: (s, text) => ({ ...s, text, counter: s.counter + 1 }),
      conflictPolicy: this.props.conflictPolicy,
    },
  };

  render() {
    const { title, description } = this.props;
    return (
      <StateDecorator<State, Actions> actions={this.actions} initialState={getInitialState()}>
        {({ counter, text }, actions) => (
          <div style={{ border: '1px solid grey', marginBottom: 10 }}>
            <h3>{title}</h3>
            <p>{description}</p>
            <div>
              <input onChange={(e) => actions.updateText(e.target.value)} />
            </div>
            <div>Server calls #: {counter}</div>
            <div>Server state: {text}</div>
          </div>
        )}
      </StateDecorator>
    );
  }
}

export default class ConflictApp extends React.Component {
  render() {
    return (
      <div>
        <ReuseConflictPolicy />
        <ConflictingActionsContainer
          title="Keep All"
          conflictPolicy={ConflictPolicy.KEEP_ALL}
          description="Chain all action calls"
        />
        <ConflictingActionsContainer
          title="Keep Last"
          conflictPolicy={ConflictPolicy.KEEP_LAST}
          description="Keep only last (more recent) call to be executed when the previous call is resolved"
        />
        <ConflictingActionsContainer
          title="Ignore"
          conflictPolicy={ConflictPolicy.IGNORE}
          description="Ignore conflicting action calls"
        />
        <ConflictingActionsContainer
          title="Reject"
          conflictPolicy={ConflictPolicy.REJECT}
          description="Return a rejected promise on a conflicting action call."
        />
        <ParallelActions />
      </div>
    );
  }
}
