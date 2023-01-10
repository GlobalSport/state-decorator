import { Button } from '@mui/material';
import { StoreActions, useLocalStore } from './sd';

type State = {};
type Actions = {
  callError: () => Promise<string>;
  resetError: () => void;
};

const getInitialState = (): State => ({});
const actions: StoreActions<State, Actions> = {
  callError: {
    getPromise: () =>
      new Promise((res, rej) => {
        setTimeout(() => {
          rej(new Error('error'));
        }, 2000);
      }),
    isErrorManaged: true,
  },
  resetError: {
    sideEffects: ({ clearError }) => {
      clearError('callError');
    },
  },
};

export default function ErrorMap() {
  const { actions: a, errorMap, loading } = useLocalStore({ getInitialState, actions });
  return (
    <div>
      <div>{loading && 'loading…'}</div>
      <div>{errorMap.callError ? 'Error!' : ''}</div>
      <div>
        <Button onClick={() => a.callError()}>Action</Button>
        <Button onClick={() => a.resetError()}>Reset Error</Button>
      </div>
    </div>
  );
}
