import React, { useMemo } from 'react';
import StateDecorator, { StateDecoratorActions, ConflictPolicy } from '../../../src/StateDecorator';
import ParallelActions from './ParallelActions';
import ReuseConflictPolicy from './ReuseConflictPolicy';

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

const getActions: (conflictPolicy: ConflictPolicy) => StateDecoratorActions<State, Actions> = (
  conflictPolicy: ConflictPolicy
) => ({
  updateText: {
    promise: ([text]) => new Promise((res) => setTimeout(res, 1000, text)),
    reducer: (s, text) => ({ ...s, text, counter: s.counter + 1 }),
    conflictPolicy: conflictPolicy,
  },
});

function ConflictingActionsContainer(props: Props) {
  const { title, description, conflictPolicy } = props;
  const actions = useMemo(() => getActions(conflictPolicy), [conflictPolicy]);

  return (
    <StateDecorator<State, Actions> actions={actions} getInitialState={getInitialState}>
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

export default function ConflictApp() {
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
