import React, { createContext } from 'react';

import { StoreActions, useGetLocalStore, StoreApi } from '../../dist';
import FlashingBox from './FlashingBox';
import SliceView from './LocalStateSliceView';

// Types
export type State = {
  value1: string;
  value2: string;
};

export type Actions = {
  setValue1: (text: string) => void;
  setValue2: (text: string) => void;
};

export type ConflictPolicyViewProps = State & Actions;

// Initial state

export const getInitialState = (): State => ({
  value1: '',
  value2: '',
});

function getTimeoutPromise<C>(timeout: number, result: C = null): Promise<C> {
  return new Promise((res) => {
    setTimeout(res, timeout, result);
  });
}

const actionsImpl: StoreActions<State, Actions, {}> = {
  setValue1: {
    getPromise: ({ args: [v] }) => getTimeoutPromise(500, v),
    effects: ({ s, res }) => ({ ...s, value1: res }),
  },
  setValue2: {
    getPromise: ({ args: [v] }) => getTimeoutPromise(1000, v),
    effects: ({ s, res }) => ({ ...s, value2: res }),
  },
};

type StoreContextProps = StoreApi<State, Actions, any>;

export const StoreContext = createContext<StoreContextProps>(null);

export function StoreContextProvider(p: { children: any }) {
  const store = useGetLocalStore(getInitialState, actionsImpl);
  return <StoreContext.Provider value={store}>{p.children}</StoreContext.Provider>;
}

function Slice() {
  return (
    <FlashingBox>
      <SliceView />
    </FlashingBox>
  );
}

export default Slice;
