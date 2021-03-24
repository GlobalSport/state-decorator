import React, { useMemo } from 'react';
import ParallelActions from './ParallelActions';
import ReuseConflictPolicy from './ReuseConflictPolicy';
import { ConflictPolicy, StateDecoratorActions } from '../../../src/types';
import useStateDecorator from '../../../src/useStateDecorator';
import { Status } from '../types';

export type State = {
  counter: number;
  text: string;
  status: Status;
};

export type Actions = {
  updateText: (text: string) => Promise<string>;
};

export const getInitialState = (): State => ({
  counter: 0,
  text: '',
  status: 'paused',
});

export interface Props {
  title: string;
  description: string;
  usage: string;
  conflictPolicy: ConflictPolicy;
}

function ConflictingActionsContainer(props: Props) {
  const { title, description, usage } = props;

  const actionsImpl = useMemo(() => {
    const actionsImpl: StateDecoratorActions<State, Actions> = {
      updateText: {
        conflictPolicy: props.conflictPolicy,
        preReducer: (s) => ({ ...s, status: 'running' }),
        promise: ([text], s, p, a, abortSignal) =>
          new Promise((resolve, reject) => {
            window.setTimeout(resolve, 2000, text);
          }),
        reducer: (s, text) => ({ ...s, text, counter: s.counter + 1, status: 'succeeded' }),
      },
    };
    return actionsImpl;
  }, [props.conflictPolicy]);

  const { state, actions, loading } = useStateDecorator(getInitialState, actionsImpl, props, {
    name: `conflict ${title}`,
    logEnabled: true,
  });

  return <ConflictingView {...state} {...actions} {...props} />;
}

type ConflictingViewProps = State & Actions & Props;

function ConflictingView(p: ConflictingViewProps) {
  const { title, description, usage, counter, text, status, updateText } = p;

  return (
    <div style={{ border: '1px solid grey', marginBottom: 10 }}>
      <h3>{title}</h3>
      <p>{description}</p>
      <p>Usage: {usage}</p>
      <div>
        <input onChange={(e) => updateText(e.target.value)} />
      </div>
      {status}
      <div>Server calls #: {counter}</div>
      <div>Server state: {text}</div>
    </div>
  );
}

export default class ConflictApp extends React.Component {
  render() {
    return (
      <div>
        <ReuseConflictPolicy />
        <ConflictingActionsContainer
          title="Keep All"
          conflictPolicy={ConflictPolicy.KEEP_ALL}
          description="Execute each action call, first in first out order"
          usage="(Default) Get requests"
        />
        <ConflictingActionsContainer
          title="Keep Last"
          conflictPolicy={ConflictPolicy.KEEP_LAST}
          description="If an action is ongoing keep the last one and execute when ongoing action is done"
          usage="Save only the last state of an editor."
        />
        <ConflictingActionsContainer
          title="Ignore"
          conflictPolicy={ConflictPolicy.IGNORE}
          description="If an action is ongoing, ignore all next calls of this action until ongoing action is done."
          usage="Action that create an object, to prevent duplicates"
        />
        <ConflictingActionsContainer
          title="Reject"
          conflictPolicy={ConflictPolicy.REJECT}
          description="Return a rejected promise on a conflicting action call."
          usage="Debug the UI"
        />

        <ParallelActions />
      </div>
    );
  }
}
