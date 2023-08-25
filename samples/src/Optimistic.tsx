import { createStore, IsLoadingFunc, StoreConfig, useStore } from './sd_src';
import { optimisticActions as optimisticActionsMiddleware } from './sd/middlewares';

import OptimisticView from './OptimisticView';
import { Status } from './types';

// Types

type State = {
  value: string;
  // during optimistic requests the loading flag for action is set to false
  // so we must track loading using this flag
  status: Status;
};

type Actions = {
  sendAction: (willFail: boolean) => Promise<string>;
  resetValue: () => void;
};

export type OptimisticViewProps = State & Actions & { isLoading: IsLoadingFunc<Actions> };

// Initial state

const storeConfig: StoreConfig<State, Actions> = {
  getInitialState: () => ({
    value: 'Initial value',
    // for the request state widget
    status: 'paused',
  }),
  actions: {
    sendAction: {
      preEffects: ({ s }) => ({ status: 'running' }),
      getPromise: ({ args: [willFail] }) => new Promise((res, rej) => setTimeout(willFail ? rej : res, 5000)),
      optimisticEffects: ({ s }) => ({ value: 'Optimistic value' }),
      errorEffects: ({ s }) => ({ status: 'errored' }),
      effects: ({ s }) => ({
        value: 'Success value',
        status: 'succeeded',
      }),
    },
    resetValue: (s) => ({ value: 'Initial value', status: 'paused' }),
  },
  notifyError: () => {},
  middlewares: [optimisticActionsMiddleware()],
};

// Actions implementation

const store = createStore(storeConfig);

// Container that is managing the state using usetateDecorator hook
const OptimisticApp = () => {
  const { state, actions, isLoading } = useStore(store);

  return <OptimisticView {...state} {...actions} isLoading={isLoading} />;
};

export default OptimisticApp;
