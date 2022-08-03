import React, { useMemo } from 'react';
import useStateDecorator, { StoreActions, ConflictPolicy } from '../../src';
import ConflictPolicyView from './ConflictPolicyView';
import { Status } from './types';

// Types
export type State = {
  calls: number;
  executions: number;
  text: string;
  status: Status;
};

export type Actions = {
  onTextChange: (text: string) => void;
  onSaveText: (text: string) => Promise<string>;
};

export interface Props {
  title: string;
  description: string;
  usage: string;
  conflictPolicy: ConflictPolicy;
}

export type ConflictPolicyViewProps = State & Actions & Props;

// Initial state

export const getInitialState = (): State => ({
  calls: 0,
  executions: 0,
  text: '',
  status: 'paused',
});

function ConflictingPolicy(props: Props) {
  const { title } = props;

  const actionsImpl = useMemo(() => {
    const actionsImpl: StoreActions<State, Actions> = {
      onTextChange: {
        effects: ({ s }) => ({ ...s, calls: s.calls + 1 }),
        sideEffects: ({ args: [text], a }) => a.onSaveText(text),
      },
      onSaveText: {
        conflictPolicy: props.conflictPolicy,
        preEffects: ({ s }) => ({ ...s, status: 'running' }),
        getPromise: ({ args: [text] }) =>
          new Promise((resolve) => {
            window.setTimeout(resolve, 2000, text);
          }),
        effects: ({ s, res: text }) => ({
          ...s,
          text,
          executions: s.executions + 1,
          status: 'succeeded',
        }),
      },
    };
    return actionsImpl;
  }, [props.conflictPolicy]);

  const { state, actions } = useStateDecorator(getInitialState, actionsImpl, props, {
    name: `conflict ${title}`,
  });

  return <ConflictPolicyView {...state} {...actions} {...props} />;
}

export default ConflictingPolicy;
