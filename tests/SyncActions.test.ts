import { createStore } from '../src/index';
import { StoreActions } from '../src/types';

describe('Advanced synchronous action', () => {
  type State = {
    prop1: string;
    prop2: number;
  };

  type Actions = {
    setProp1: (p: string) => void;
    setProp2: (p: number) => void;
    setDebounced: (p: number) => void;
    setCancelled: (p: number) => void;
  };

  type Props = {
    callback: (s: State) => void;
    callbackCancelled: () => void;
  };

  const actionsImpl: StoreActions<State, Actions, Props> = {
    setProp1: { effects: ({ s, args: [p] }) => ({ ...s, prop1: p }) },
    setProp2: {
      effects: ({ s, args: [p] }) => ({ ...s, prop2: p }),
      sideEffects: ({ s, p }) => {
        p.callback(s);
      },
    },
    setDebounced: {
      effects: ({ s, args: [p] }) => ({ ...s, prop2: p }),
      sideEffects: ({ s, p }) => {
        p.callback(s);
      },
      debounceSideEffectsTimeout: 50,
    },
    setCancelled: { effects: () => null, sideEffects: ({ p }) => p.callbackCancelled() },
  };

  const getInitialState = (): State => ({
    prop1: '',
    prop2: 0,
  });

  it('works as expected', () => {
    const store = createStore(getInitialState, actionsImpl);
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackCancelled = jest.fn(() => {
      throw new Error('Must not have been called');
    });

    store.addStateListener(listener);
    store.setProps({ callback, callbackCancelled });

    expect(store.state).toEqual({
      prop1: '',
      prop2: 0,
    });

    const { setProp1, setProp2, setCancelled } = store.actions;

    // init
    expect(listener).toHaveBeenCalledTimes(1);

    setProp1('coucou');

    expect(listener).toHaveBeenCalledTimes(2);

    expect(store.state).toEqual({
      prop1: 'coucou',
      prop2: 0,
    });

    setProp2(23);

    expect(listener).toHaveBeenCalledTimes(3);

    expect(store.state).toEqual({
      prop1: 'coucou',
      prop2: 23,
    });

    expect(callback).toHaveBeenCalledWith({
      prop1: 'coucou',
      prop2: 23,
    });

    setCancelled(23);

    // not called
    expect(listener).toHaveBeenCalledTimes(3);
    expect(callbackCancelled).not.toHaveBeenCalled();

    expect(store.state).toEqual({
      prop1: 'coucou',
      prop2: 23,
    });
  });

  it('debounced side effects', (done) => {
    const store = createStore(getInitialState, actionsImpl);

    const listener = jest.fn();
    const callback = jest.fn((s: State) => {});

    const callbackCancelled = jest.fn();

    store.addStateListener(listener);
    store.setProps({ callback, callbackCancelled });

    const { setDebounced } = store.actions;

    setDebounced(23);

    expect(listener).toHaveBeenCalledTimes(2);

    expect(store.state).toEqual({
      prop1: '',
      prop2: 23,
    });

    setTimeout(() => {
      expect(callback).toHaveBeenCalledWith({
        prop1: '',
        prop2: 23,
      });
      done();
    }, 75);

    expect(callback).not.toHaveBeenCalled();
  });

  it('debounced side effects (destroy before end)', () => {
    const store = createStore(getInitialState, actionsImpl);

    const listener = jest.fn();
    const callback = jest.fn((s: State) => {});

    const callbackCancelled = jest.fn();

    store.addStateListener(listener);
    store.setProps({ callback, callbackCancelled });

    const { setDebounced } = store.actions;

    setDebounced(23);
    setDebounced(23);

    store.destroy();
  });
});
