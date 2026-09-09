/**
 * @jest-environment jsdom
 */

import React, { createContext } from 'react';
import { renderHook, act, Act } from '@testing-library/react-hooks';
import * as ReactDOM from 'react-dom';
import { act as domAct } from 'react-dom/test-utils';
import {
  useLocalStore,
  useStore,
  useStoreSlice,
  createStore,
  StoreActions,
  StoreApi,
  useStoreContextSlice,
  StoreOptions,
  useBindStore,
  StoreConfig,
} from '../src';
import { getTimeoutPromise } from './utils';

type State = {
  stateProp1: string;
};

type Actions = {
  setProp1: (p: string) => void;
  setAsyncProp1: (p: string) => Promise<string>;
};

type Props = {
  prop1: string;
  prop2?: string;
};

const actionsImpl: StoreActions<State, Actions, Props> = {
  setProp1: ({ args: [p] }) => ({ stateProp1: p }),
  setAsyncProp1: {
    getPromise: () => getTimeoutPromise(100, 'ok'),
    effects: ({ args: [p] }) => ({ stateProp1: p }),
  },
};

const getInitialState = (p: Props): State => ({
  stateProp1: p?.prop1 ?? '',
});

type StoreContextProps = StoreApi<State, Actions, Props>;

const StoreContext = createContext<StoreContextProps>(null);

function StoreContextProvider(p: { children: any }) {
  const store = useLocalStore({ getInitialState, actions: actionsImpl }, { prop1: '' }, false);
  return <StoreContext.Provider value={store}>{p.children}</StoreContext.Provider>;
}

describe('react hooks', () => {
  it('useLocalStore works as expected', () => {
    const { result } = renderHook(() => useLocalStore({ getInitialState, actions: actionsImpl }));
    expect(result.current.state).toEqual({ stateProp1: '' });
    act(() => {
      result.current.actions.setProp1('v1');
    });
    expect(result.current.state).toEqual({ stateProp1: 'v1' });
  });

  it('useLocalStore works as expected', () => {
    const callback = jest.fn();
    const callback2 = jest.fn();

    const storeConfig: StoreConfig<State, Actions, Props> = {
      getInitialState,
      actions: actionsImpl,
      onMountDeferred: () => {
        callback();
      },
      onPropsChange: {
        onMountDeferred: true,
        getDeps: () => [],
        sideEffects: () => {
          callback2();
        },
      },
    };

    const { result } = renderHook(() => useLocalStore(storeConfig, { prop1: '' }));
    expect(result.current.state).toEqual({ stateProp1: '' });
    act(() => {
      result.current.actions.setProp1('v1');
    });
    expect(result.current.state).toEqual({ stateProp1: 'v1' });
    expect(callback).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();

    // use store API
    result.current.destroy();
    expect(result.current.state).toBeNull();
  });

  it('useLocalStore calls onMount exactly once on mount', () => {
    const onMount = jest.fn();

    const storeConfig: StoreConfig<State, Actions, Props> = {
      getInitialState,
      actions: actionsImpl,
      onMount,
    };

    renderHook(() => useLocalStore(storeConfig, { prop1: '' }));

    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it('useLocalStore reflects an onMount-flagged onPropsChange effect on first paint', () => {
    // Regression test: onMount-flagged onPropsChange effects (and onMount itself) are applied from a
    // layout effect (runMountEffects), not during render. The state listener that schedules the
    // re-render must already be registered by the time that effect fires, or the first paint would
    // render stale (missing the mount-time effect) until some unrelated update happened to occur.
    //
    // This must assert on actual DOM output (not `store.state`, a live getter that reflects internal
    // state regardless of whether a re-render was ever triggered) to catch a missed re-render.
    const storeConfig: StoreConfig<State, Actions, Props> = {
      getInitialState,
      actions: actionsImpl,
      onPropsChange: {
        getDeps: () => [],
        effects: () => ({ stateProp1: 'from-mount-effect' }),
        onMount: true,
      },
    };

    function TestComponent() {
      const store = useLocalStore(storeConfig, { prop1: 'initial' });
      return <div>{store.state.stateProp1}</div>;
    }

    const container = document.createElement('div');
    domAct(() => {
      ReactDOM.render(<TestComponent />, container);
    });

    expect(container.textContent).toEqual('from-mount-effect');

    domAct(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
  });

  it('useStore works as expected', () => {
    const store = createStore({ getInitialState, actions: actionsImpl });
    store.init({ prop1: '' });
    const { result } = renderHook(() => useStore(store));
    expect(store.state.stateProp1).toEqual('');
    act(() => {
      store.actions.setProp1('v1');
    });
    expect(store.state.stateProp1).toEqual('v1');
  });

  it('useBindStore works as expected', () => {
    const storeConfig: StoreConfig<State, Actions, Props> = {
      getInitialState,
      actions: actionsImpl,
      onPropsChange: {
        getDeps: (p) => [p.prop1],
        effects: ({ p }) => ({ stateProp1: p.prop1 }),
      },
    };
    const store = createStore(storeConfig);

    const { result, rerender } = renderHook((props: Props) => useBindStore(store, props), {
      initialProps: {
        prop1: 'initial',
      },
    });
    expect(store.state.stateProp1).toEqual('initial');

    act(() => {
      store.actions.setProp1('v1');
    });
    expect(store.state.stateProp1).toEqual('v1');

    rerender({ prop1: 'other' });
    expect(store.state.stateProp1).toEqual('other');
  });

  it('useStoreSlice works as expected (props)', () => {
    const store = createStore({ getInitialState, actions: actionsImpl });
    // parent hook will init the store
    store.init({ prop1: '', prop2: 'prop2' });

    const { result } = renderHook(() => useStoreSlice(store, ['stateProp1', 'setProp1', 'prop2']));

    expect(result.current.stateProp1).toEqual('');
    expect(result.current.prop2).toEqual('prop2');

    act(() => {
      result.current.setProp1('v1');
    });

    expect(result.current.stateProp1).toEqual('v1');
    expect(result.current.prop2).toEqual('prop2');
  });

  it('useStoreSlice works as expected (func)', () => {
    const store = createStore({ getInitialState, actions: actionsImpl });
    // parent hook will init the store
    store.init({ prop1: '' });

    const { result } = renderHook(() =>
      useStoreSlice(store, (ctx) => ({
        res: ctx.stateProp1,
        set: ctx.setProp1,
      }))
    );

    expect(result.current.res).toEqual('');

    act(() => {
      result.current.set('v1');
    });

    expect(result.current.res).toEqual('v1');
  });

  it('useStoreSlice works as expected (func + deps)', () => {
    const store = createStore({ getInitialState, actions: actionsImpl });
    store.init({ prop1: '' });

    // External dependency that the slicer function closes over
    let multiplier = 1;

    const { result, rerender } = renderHook(() =>
      useStoreSlice(
        store,
        (ctx) => ({
          res: ctx.stateProp1 ? `${ctx.stateProp1}_${multiplier}` : '',
          set: ctx.setProp1,
        }),
        [multiplier]
      )
    );

    expect(result.current.res).toEqual('');

    act(() => {
      result.current.set('v1');
    });

    // multiplier=1 → appended "_1"
    expect(result.current.res).toEqual('v1_1');

    // Change the external dependency and rerender to trigger memo update
    multiplier = 2;
    rerender();

    // Now the slicer re-runs with the new multiplier
    expect(result.current.res).toEqual('v1_2');
  });

  it('useStoreContextSlice works as expected (func)', () => {
    const wrapper = ({ children }) => <StoreContextProvider>{children}</StoreContextProvider>;

    const { result } = renderHook(
      () =>
        useStoreContextSlice(StoreContext, (ctx) => ({
          res: ctx.stateProp1,
          set: ctx.setProp1,
        })),
      { wrapper }
    );

    expect(result.current.res).toEqual('');

    act(() => {
      result.current.set('v1');
    });

    expect(result.current.res).toEqual('v1');
  });

  it('useStoreContextSlice works as expected (props)', () => {
    const wrapper = ({ children }) => <StoreContextProvider>{children}</StoreContextProvider>;

    const { result } = renderHook(() => useStoreContextSlice(StoreContext, ['stateProp1', 'setProp1']), { wrapper });

    expect(result.current.stateProp1).toEqual('');

    act(() => {
      result.current.setProp1('v1');
    });

    expect(result.current.stateProp1).toEqual('v1');
  });
});
