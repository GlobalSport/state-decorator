import React, { memo, useContext } from 'react';
import useLocalStore, { StoreActions, LoadingProps, StoreOptions } from '../../src';
import { setResIn } from '../../src/helpers';
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

export function getInitialState(p: Props): State {
  return { childProp: 'initial' };
}

// ACTIONS =============================

export const actions: StoreActions<State, Actions, Props> = {
  onLoadChild: {
    getPromise: () =>
      new Promise((resolve) => {
        setTimeout(() => resolve('valueChild'), 2000);
      }),
    effects: setResIn('childProp'),
  },
};

export const options: StoreOptions<State, Actions, Props> = {
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

  const { state, loadingMap } = useLocalStore(getInitialState, actions, props, options);

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
