import { memo } from 'react';
import useLocalStore, { ConflictPolicy, AbortActionCallback } from './sd_src';
import { Status } from './types';
import AbortView from './AbortView';
import { StoreConfig } from './sd/types';
export type AbortProps = {};

export type AbortState = {
  status: Status;
};

export type AbortActions = {
  onAction: (willCrash: boolean) => Promise<string>;
};

type Props = AbortProps;
type State = AbortState;
type Actions = AbortActions;

export type AbortViewProps = Props &
  Actions &
  State & {
    abortAction: AbortActionCallback<Actions>;
  };

const storeConfig: StoreConfig<State, Actions, Props> = {
  getInitialState: () => ({ status: 'paused' }),
  actions: {
    onAction: {
      conflictPolicy: ConflictPolicy.IGNORE,
      abortable: true,
      preEffects: () => ({ status: 'running' }),
      getPromise: ({ args: [willCrash], abortSignal }) =>
        new Promise<string>((resolve, reject) => {
          const timeout = window.setTimeout(
            willCrash ? reject : resolve,
            5000,
            willCrash ? new Error('boom') : 'result'
          );
          abortSignal.addEventListener('abort', () => {
            window.clearTimeout(timeout);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
      errorEffects: ({ err }) => (err.name === 'AbortError' ? { status: 'aborted' } : { status: 'errored' }),
      effects: ({ s }) => ({ status: 'succeeded' }),
      errorSideEffects: ({ err }) => {
        if (err.name === 'AbortError') {
          console.log('AbortError side effect');
        } else {
          console.log('Other error side effect');
        }
      },
    },
  },
};

export default memo(function Abort() {
  const { state: s, actions: a, abortAction } = useLocalStore(storeConfig);

  return <AbortView status={s.status} onAction={a.onAction} abortAction={abortAction} />;
});
