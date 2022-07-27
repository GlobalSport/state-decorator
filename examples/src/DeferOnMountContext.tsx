import React, { createContext } from 'react';
import useLocalStore, { StoreActions, LoadingProps } from '../../src';
import { setResIn } from '../../src/helpers';

// TYPES ===============================

export type PropsIn = {
  children: any;
};

export type State = {
  myProp: string;
};

export type Actions = {
  onLoad: () => Promise<string>;
};

type Props = {};

// INITIAL STATE =======================

export function getInitialState(p: Props): State {
  return {
    myProp: 'initial',
  };
}

export const actions: StoreActions<State, Actions, Props> = {
  onLoad: {
    getPromise: () =>
      new Promise((resolve) => {
        setTimeout(() => resolve('value'), 3000);
      }),
    effects: setResIn('myProp'),
  },
};

// CONTEXT ================================

export type ContextProps = Props & Actions & State & Pick<LoadingProps<Actions>, 'loadingMap'>;

export const Context = createContext<ContextProps>(null);

// VIEW ================================

// CONTAINER ===========================

export function Provider(p: PropsIn) {
  const { state: s, actions: a, loadingMap } = useLocalStore(getInitialState, actions, p);

  console.log(loadingMap);

  return (
    <Context.Provider
      value={{
        ...s,
        ...a,
        ...p,
        loadingMap,
      }}
    >
      {p.children}
    </Context.Provider>
  );
}
