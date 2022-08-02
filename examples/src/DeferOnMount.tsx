import React, { memo, useContext } from 'react';
import useLocalStore, { StoreActions, LoadingProps, StoreOptions } from '../../src';
import { setResIn } from '../../src/helpers';
import { StoreConfig } from '../../src/types';
import { Context, ContextProps, Provider } from './DeferOnMountContext';

// TYPES ===============================

type Props = ContextProps;
type State = {
  childProp: string;
};
type Actions = {
  onLoadChild: () => Promise<string>;
};

// INITIAL STATE =======================

const storeConfig: StoreConfig<State, Actions, Props> = {
  getInitialState: () => ({
    childProp: 'initial',
  }),
  actions: {
    onLoadChild: {
      getPromise: () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('valueChild'), 2000);
        }),
      effects: setResIn('childProp'),
    },
  },
  onMount: ({ a }) => {
    a.onLoadChild();
  },
  onMountDeferred: ({ p }) => {
    p.onLoad();
  },
};

// VIEW ================================

export type ViewProps = Props & Actions & State & Pick<LoadingProps<Actions>, 'loadingMap'>;

// CONTAINER ===========================

export default function () {
  return (
    <Provider>
      <DeferOnMount />
    </Provider>
  );
}

function DeferOnMount() {
  const ctx = useContext(Context);
  const props: Props = ctx;

  const { state, loadingMap } = useLocalStore(storeConfig, props);

  console.log(loadingMap);

  return (
    <div>
      <div>
        Context: {props.myProp} {props.loadingMap.onLoad.toString()}
      </div>
      <div>
        Child: {state.childProp} {loadingMap.onLoadChild.toString()}
      </div>
    </div>
  );
}
