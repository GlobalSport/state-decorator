import React, { createContext } from 'react';
import useLocalStore, { LoadingProps, StoreConfig } from './sd_src';
import { setResIn } from './sd/helpers';

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
const storeConfig: StoreConfig<State, Actions, Props> = {
  getInitialState: () => ({
    myProp: 'initial',
  }),
  actions: {
    onLoad: {
      getPromise: () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('value'), 3000);
        }),
      effects: setResIn('myProp'),
    },
  },
};

// CONTEXT ================================

export type ContextProps = Props & Actions & State & Pick<LoadingProps<Actions>, 'loadingMap'>;

export const Context = createContext<ContextProps>(null);

// VIEW ================================

// CONTAINER ===========================

export function Provider(p: PropsIn) {
  const { state: s, actions: a, loadingMap } = useLocalStore(storeConfig);

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
