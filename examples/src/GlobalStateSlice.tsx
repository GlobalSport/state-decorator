import React from 'react';

import { StoreActions, createStore } from '../../src';
import { devtools } from '../../lib/es/middlewares';
import FlashingBox from './FlashingBox';
import SliceView from './GlobalStateSliceView';
import { StoreConfig } from '../../src/types';
import { setResIn } from '../../src/helpers';

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

function getTimeoutPromise<C>(timeout: number, result: C = null): Promise<C> {
  return new Promise((res) => {
    setTimeout(res, timeout, result);
  });
}

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
  middlewares: [devtools()],
};

export const store = createStore(storeConfig);
store.init(null);

function Slice() {
  return (
    <FlashingBox>
      <SliceView />
    </FlashingBox>
  );
}

export default Slice;
