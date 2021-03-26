import React from 'react';
import { useBindStore, StoreActions, createStore } from '../../dist';
import SliceView from './SliceView';

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

const actionsImpl: StoreActions<State, Actions> = {
  setValue1: {
    getPromise: ({ args: [v] }) => getTimeoutPromise(500, v),
    effects: ({ s, res }) => ({ ...s, value1: res }),
  },
  setValue2: {
    getPromise: ({ args: [v] }) => getTimeoutPromise(1000, v),
    effects: ({ s, res }) => ({ ...s, value2: res }),
  },
};

export const store = createStore(getInitialState, actionsImpl);

function Slice() {
  useBindStore(store);

  return <SliceView />;
}

export default Slice;
