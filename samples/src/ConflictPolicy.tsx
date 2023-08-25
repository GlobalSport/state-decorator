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
      onSaveText: {
        abortable: true,
        conflictPolicy,
        preEffects: ({ s }) => ({ status: 'running', calls: s.calls + 1 }),
        getPromise: ({ args: [text], abortSignal }) =>
          new Promise((resolve, reject) => {
            let time = Date.now();
            const id = window.setTimeout(() => {
              resolve(text);
            }, 5000);
            abortSignal.addEventListener('abort', () => {
              reject(new Error('aborted'));
              clearTimeout(id);
            });
          }),
        effects: ({ s, res: text }) => {
          return {
            text,
            executions: s.executions + 1,
            status: 'succeeded',
          };
        },
        rejectPromiseOnError: true,
      },
    },
  };
}

function ConflictingPolicy(props: Props) {
  const config = useMemo(() => getStoreConfig(props.conflictPolicy), [props.conflictPolicy]);

  const { state, actions } = useLocalStore(config);

  return <ConflictPolicyView {...state} {...actions} {...props} />;
}

export default ConflictingPolicy;
