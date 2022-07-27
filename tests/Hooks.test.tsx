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
} from '../src';
import { getTimeoutPromise } from './utils';

type State = {
  prop1: string;
};

type Actions = {
  setProp1: (p: string) => void;
  setAsyncProp1: (p: string) => Promise<string>;
};

const actionsImpl: StoreActions<State, Actions, any> = {
  setProp1: ({ args: [p] }) => ({ prop1: p }),
  setAsyncProp1: {
    getPromise: () => getTimeoutPromise(100, 'ok'),
    effects: ({ args: [p] }) => ({ prop1: p }),
  },
};

const getInitialState = (): State => ({
  prop1: '',
});

type StoreContextProps = StoreApi<State, Actions, any>;

const StoreContext = createContext<StoreContextProps>(null);

function StoreContextProvider(p: { children: any }) {
  const store = useLocalStore(getInitialState, actionsImpl, {}, {}, [], false);
  return <StoreContext.Provider value={store}>{p.children}</StoreContext.Provider>;
}

describe('react hooks', () => {
  it('useLocalStore works as expected', () => {
    const { result } = renderHook(() => useLocalStore(getInitialState, actionsImpl));
    expect(result.current.state).toEqual({ prop1: '' });
    act(() => {
      result.current.actions.setProp1('v1');
    });
    expect(result.current.state).toEqual({ prop1: 'v1' });
  });

  it('useLocalStore works as expected', () => {
    const callback = jest.fn();
    const callback2 = jest.fn();

    const options: StoreOptions<State, Actions> = {
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

    const { result } = renderHook(() => useLocalStore(getInitialState, actionsImpl, {}, options));
    expect(result.current.state).toEqual({ prop1: '' });
    act(() => {
      result.current.actions.setProp1('v1');
    });
    expect(result.current.state).toEqual({ prop1: 'v1' });
    expect(callback).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();

    // use store API
    result.current.destroy();
    expect(result.current.state).toBeNull();
  });

  it('useStore works as expected', () => {
    const store = createStore(getInitialState, actionsImpl);
    const { result } = renderHook(() => useStore(store));
    expect(result.current.state).toEqual({ prop1: '' });
    act(() => {
      result.current.actions.setProp1('v1');
    });
    expect(result.current.state).toEqual({ prop1: 'v1' });
  });

  it('useStoreSlice works as expected (props)', () => {
    const store = createStore(getInitialState, actionsImpl);
    // parent hook will init the store
    store.init({});

    const { result } = renderHook(() => useStoreSlice(store, ['prop1', 'setProp1']));

    expect(result.current.prop1).toEqual('');

    act(() => {
      result.current.setProp1('v1');
    });

    expect(result.current.prop1).toEqual('v1');
  });

  it('useStoreSlice works as expected (props, loadingMap) ', () => {
    const store = createStore(getInitialState, actionsImpl);
    // parent hook will init the store
    store.init({});

    const { result } = renderHook(() => useStoreSlice(store, ['prop1', 'setAsyncProp1'], ['setAsyncProp1']));

    expect(result.current.prop1).toEqual('');

    act(() => {
      result.current.setAsyncProp1('v1');
    });

    expect(result.current.loadingMap.setAsyncProp1).toBeTruthy();
  });

  it('useStoreSlice works as expected (func)', () => {
    const store = createStore(getInitialState, actionsImpl);
    // parent hook will init the store
    store.init({});

    const { result } = renderHook(() =>
      useStoreSlice(store, (ctx) => ({
        res: ctx.prop1,
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
          res: ctx.prop1,
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

    const { result } = renderHook(() => useStoreContextSlice(StoreContext, ['prop1', 'setProp1']), { wrapper });

    expect(result.current.prop1).toEqual('');

    act(() => {
      result.current.setProp1('v1');
    });

    expect(result.current.prop1).toEqual('v1');
  });

  it('useStoreContextSlice works as expected (props, loadingMap)', () => {
    const wrapper = ({ children }) => <StoreContextProvider>{children}</StoreContextProvider>;

    const { result } = renderHook(
      () => useStoreContextSlice(StoreContext, ['prop1', 'setAsyncProp1'], ['setAsyncProp1']),
      { wrapper }
    );

    expect(result.current.prop1).toEqual('');

    act(() => {
      result.current.setAsyncProp1('v1');
    });

    expect(result.current.loadingMap.setAsyncProp1).toBeTruthy();
  });
});
