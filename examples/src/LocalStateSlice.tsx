import React, { createContext } from 'react';

import { useLocalStore, StoreApi } from '../../src';
import { setResIn } from '../../src/helpers';
import { StoreConfig } from '../../src/types';
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

const storeConfig: StoreConfig<State, Actions> = {
  name: 'Slice store',
  getInitialState: () => ({
    value1: '',
    value2: '',
  }),

  actions: {
    setValue1: {
      getPromise: ({ args: [v] }) => getTimeoutPromise(500, v),
      effects: setResIn('value1'),
    },
    setValue2: {
      getPromise: ({ args: [v] }) => getTimeoutPromise(1000, v),
      effects: setResIn('value2'),
    },
  },
};

function getTimeoutPromise<C>(timeout: number, result: C = null): Promise<C> {
  return new Promise((res) => {
    setTimeout(res, timeout, result);
  });
}

type StoreContextProps = StoreApi<State, Actions, any>;

export const StoreContext = createContext<StoreContextProps>(null);

export function StoreContextProvider(p: { children: any }) {
  // second parameter prevents refresh of component if state is changing
  const store = useLocalStore(storeConfig, false);
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
