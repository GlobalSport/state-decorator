import React from 'react';
import { createStore, IsLoadingFunc, StoreActions, useStore } from '../../lib/es';
import { optimisticActions as optimisticActionsMiddleware } from '../../lib/es/middlewares';

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

export const getInitialState = (): State => ({
  value: 'Initial value',
  // for the request state widget
  status: 'paused',
});

// Actions implementation

export const optimisticActions: StoreActions<State, Actions> = {
  sendAction: {
    preEffects: ({ s }) => ({ ...s, status: 'running' }),
    getPromise: ({ args: [willFail] }) => new Promise((res, rej) => setTimeout(willFail ? rej : res, 5000)),
    optimisticEffects: ({ s }) => ({ ...s, value: 'Optimistic value' }),
    errorEffects: ({ s }) => ({ ...s, status: 'errored' }),
    effects: ({ s }) => ({
      ...s,
      value: 'Success value',
      status: 'succeeded',
    }),
  },
  resetValue: (s) => ({ ...s, value: 'Initial value', status: 'paused' }),
};

const store = createStore(getInitialState, optimisticActions, { notifyError: () => {} }, [
  optimisticActionsMiddleware(),
]);

// Container that is managing the state using usetateDecorator hook
const CounterContainer = () => {
  const { state, actions, isLoading } = useStore(store);

  return <OptimisticView {...state} {...actions} isLoading={isLoading} />;
};

export default CounterContainer;
