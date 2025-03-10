import { useRef } from 'react';
import useLocalStore, { StoreConfig, LoadingProps } from './sd_src/index';
import useLogger from './useLogger';

// TYPES ===============================

type OptimRefreshProps = {};
type Props = {};
type State = {
  v: number;
};
type Actions = {
  a1: () => Promise<number>;
  a2: () => Promise<number>;
};

const storeConfig: StoreConfig<State, Actions, Props> = {
  initialState: {
    v: 1,
  },
  actions: {
    a1: {
      getPromise: () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(10), 2000);
        }),
      sideEffects: ({ a }) => {
        a.a2();
      },
    },
    a2: {
      getPromise: () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(20), 3000);
        }),
      effects: ({ res }) => ({ v: res }),
    },
  },
  onMount: ({ a }) => {
    a.a1();
  },
};

// VIEW ================================

export type OptimRefreshViewProps = State & Actions & Pick<LoadingProps<Actions>, 'loadingMap'>;

export function OptimRefreshView(p: OptimRefreshViewProps) {
  useLogger('compo', p);

  return <div>See console</div>;
}

// CONTAINER ===========================

export function OptimRefresh(p: OptimRefreshProps) {
  const { state: s, actions: a, loadingMap } = useLocalStore(storeConfig, p);
  return <OptimRefreshView {...p} {...s} {...a} loadingMap={loadingMap} />;
}
