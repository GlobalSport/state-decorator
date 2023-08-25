import { useMemo } from 'react';
import useLocalStore, { ConflictPolicy, StoreConfig } from './sd_src';
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

function getStoreConfig(conflictPolicy: ConflictPolicy): StoreConfig<State, Actions, Props> {
  return {
    getInitialState: () => ({
      calls: 0,
      executions: 0,
      text: '',
      status: 'paused',
    }),
    actions: {
      onTextChange: {
        effects: ({ s }) => ({ calls: s.calls + 1 }),
        sideEffects: ({ args: [text], a }) => a.onSaveText(text),
      },
      onSaveText: {
        conflictPolicy,
        preEffects: ({ s }) => ({ status: 'running' }),
        getPromise: ({ args: [text] }) =>
          new Promise((resolve) => {
            window.setTimeout(resolve, 2000, text);
          }),
        effects: ({ s, res: text }) => ({
          text,
          executions: s.executions + 1,
          status: 'succeeded',
        }),
      },
    },
  };
}

function ConflictingPolicy(props: Props) {
  const { title } = props;

  const config = useMemo(() => getStoreConfig(props.conflictPolicy), [props.conflictPolicy]);

  const { state, actions } = useLocalStore(config);

  return <ConflictPolicyView {...state} {...actions} {...props} />;
}

export default ConflictingPolicy;
