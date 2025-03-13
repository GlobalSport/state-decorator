import useLocalStore, { StoreConfig, LoadingProps } from './sd_src/index';
import useLogger from './useLogger';
import Button from '@mui/material/Button';

// TYPES ===============================

type OptimRefreshProps = {};
type Props = {};
type State = {
  v: number;
};
type Actions = {
  a1: () => Promise<number>;
  a2: () => Promise<number>;
  a3: () => void;
  a4: () => void;
  a5: () => void;
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
      effects: () => ({ v: 99 }),
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
    a3: {
      effects: () => ({ v: 66 }),
      sideEffects: ({ a }) => {
        a.a1();
      },
    },
    a4: {
      debounceSideEffectsTimeout: 1000,
      effects: () => {
        return { v: 44 };
      },
      sideEffects: ({ a }) => {
        a.a1();
      },
    },
    a5: { effects: () => ({ v: 22 }) },
  },
};

// VIEW ================================

export type OptimRefreshViewProps = State & Actions & Pick<LoadingProps<Actions>, 'loadingMap'>;

export function OptimRefreshView(p: OptimRefreshViewProps) {
  useLogger('OptimRefresh', p);

  return (
    <div>
      <div>
        <div>A1: Async, call A2</div>
        <div>A2: Async</div>
        <div>A3: Sync call A1 as side effect</div>
        <div>A4: Sync call A1 as side effect with debounce</div>
        <div>A5: Sync no side effect</div>
      </div>
      <br />
      {([1, 2, 3, 4, 5] as const).map((x) => (
        <Button
          key={x}
          variant="outlined"
          onClick={() => {
            p[`a${x}`]();
          }}
        >
          Launch action A{x}
        </Button>
      ))}

      <div>See console</div>
    </div>
  );
}

// CONTAINER ===========================

export function OptimRefresh(p: OptimRefreshProps) {
  const { state: s, actions: a, loadingMap } = useLocalStore(storeConfig, p);
  return <OptimRefreshView {...p} {...s} {...a} loadingMap={loadingMap} />;
}
