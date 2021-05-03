import { renderHook, act } from '@testing-library/react-hooks';
import { useLocalStore, useBindStore, useStore, useStoreSlice, createStore, StoreActions } from '../src/';

describe('react hooks', () => {
  type State = {
    prop1: string;
  };

  type Actions = {
    setProp1: (p: string) => void;
  };

  const actionsImpl: StoreActions<State, Actions, any> = {
    setProp1: ({ s, args: [p] }) => ({ ...s, prop1: p }),
  };

  const getInitialState = (): State => ({
    prop1: '',
  });

  it('useLocalStore works as expected', () => {
    const { result } = renderHook(() => useLocalStore(getInitialState, actionsImpl));
    expect(result.current.state).toEqual({ prop1: '' });
    act(() => {
      result.current.actions.setProp1('v1');
    });
    expect(result.current.state).toEqual({ prop1: 'v1' });
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

  it('useBindStore works as expected', () => {
    const store = createStore(getInitialState, actionsImpl);
    const { result } = renderHook(() => useBindStore(store));
    expect(result.current.state).toEqual({ prop1: '' });
    act(() => {
      result.current.actions.setProp1('v1');
    });
    expect(result.current.state).toEqual({ prop1: 'v1' });
  });

  it('useStoreSlice works as expected', () => {
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
});
