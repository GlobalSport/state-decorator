/**
 * @jest-environment jsdom
 */

import React, { createContext } from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
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
