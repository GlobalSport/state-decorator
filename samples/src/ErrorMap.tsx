import { Button, Typography } from '@mui/material';
import { StoreActions, useLocalStore } from './sd_src';

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
      <Typography variant="h4">Error management by application</Typography>
      <Typography variant="caption">
        If <code>isErrorManaged</code> is set on the action, if the promise failed the error can be accessed in the{' '}
        <code>errorMap</code> object. The store exposes the <code>clearError</code> function to manually clear the error
        or it will be reset automatically at next action call.
      </Typography>
      <div>{loading && 'loading…'}</div>
      <div>{errorMap.callError ? 'Error!' : ''}</div>
      <div>
        <Button onClick={() => a.callError()}>Action</Button>
        <Button onClick={() => a.resetError()}>Reset Error</Button>
      </div>
    </div>
  );
}
