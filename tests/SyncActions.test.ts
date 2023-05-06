import { createStore } from '../src/index';
import { StoreActions, StoreConfig } from '../src/types';

describe('Advanced synchronous action', () => {
  type State = {
    prop1: string;
    prop2: number;
  };

  type Actions = {
    setProp1: (p: string) => void;
    setProp2: (p: number) => void;
    sideEffects: () => void;
    setEffectsDebounced: (p: number) => void;
    setSideEffectsDebounced: (p: number) => void;
    setSideEffectsDebounced2: (p: number) => void;
    setCancelled: (p: number) => void;
  };

  type Props = {
    callback: (s: State) => void;
    callbackCancelled: () => void;
    callbackSideEffects?: (s: State) => void;
  };

  const actions: StoreActions<State, Actions, Props> = {
    setProp1: { effects: ({ args: [p] }) => ({ prop1: p }) },
    setProp2: {
      effects: ({ args: [p] }) => ({ prop2: p }),
      sideEffects: ({ s, p }) => {
        p.callback(s);
      },
    },
    sideEffects: {
      sideEffects: ({ s, p }) => {
        p.callbackSideEffects(s);
      },
    },
    setEffectsDebounced: {
      effects: ({ args: [p] }) => ({ prop2: p }),
      sideEffects: ({ s, p }) => {
        p.callback(s);
      },
      debounceTimeout: 50,
    },
    setSideEffectsDebounced: {
      effects: ({ args: [p] }) => ({ prop2: p }),
      sideEffects: ({ s, p }) => {
        p.callback(s);
      },
      debounceSideEffectsTimeout: 50,
    },
    setSideEffectsDebounced2: {
      effects: ({ args: [p] }) => ({ prop2: p }),
      debounceSideEffectsTimeout: 50,
    },
    setCancelled: { effects: () => null, sideEffects: ({ p }) => p.callbackCancelled() },
  };

  const getInitialState = (): State => ({
    prop1: '',
    prop2: 0,
  });

  it('works as expected', () => {
    const store = createStore({ getInitialState, actions });
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackSideEffects = jest.fn();
    const callbackCancelled = jest.fn(() => {
      throw new Error('Must not have been called');
    });

    store.addStateListener(listener);
    store.setProps({ callback, callbackCancelled, callbackSideEffects });

    expect(store.state).toEqual({
      prop1: '',
      prop2: 0,
    });

    const { setProp1, setProp2, sideEffects, setCancelled } = store.actions;

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

    // cancel both effects and sideEffects if null is returned by effects
    setCancelled(23);

    // not called
    expect(listener).toHaveBeenCalledTimes(3);
    expect(callbackCancelled).not.toHaveBeenCalled();

    expect(store.state).toEqual({
      prop1: 'coucou',
      prop2: 23,
    });

    // allow to call sideEffects only
    sideEffects();

    // not called
    expect(listener).toHaveBeenCalledTimes(3);
    expect(callbackSideEffects).toHaveBeenCalledWith({
      prop1: 'coucou',
      prop2: 23,
    });
    expect(store.state).toEqual({
      prop1: 'coucou',
      prop2: 23,
    });
  });

  it('debounced side effects', (done) => {
    const store = createStore({ getInitialState, actions });

    const listener = jest.fn();
    const callback = jest.fn((s: State) => {});

    const callbackCancelled = jest.fn();

    store.addStateListener(listener);
    store.setProps({ callback, callbackCancelled });

    const { setSideEffectsDebounced: setDebounced } = store.actions;

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

  it('debounced no side effects', (done) => {
    const store = createStore({ getInitialState, actions });

    const listener = jest.fn();
    const callback = jest.fn((s: State) => {});

    const callbackCancelled = jest.fn();

    store.addStateListener(listener);
    store.setProps({ callback, callbackCancelled });

    const { setSideEffectsDebounced2: setDebounced } = store.actions;

    setDebounced(23);

    // should not crash
    done();
  });

  it('debounced effects', (done) => {
    const store = createStore({ getInitialState, actions });

    const listener = jest.fn();
    const callback = jest.fn((s: State) => {});

    const callbackCancelled = jest.fn();

    store.addStateListener(listener);
    store.setProps({ callback, callbackCancelled });

    const { setEffectsDebounced: setDebounced } = store.actions;

    setDebounced(23);

    expect(listener).toHaveBeenCalledTimes(1);

    expect(store.state).toEqual({
      prop1: '',
      prop2: 0,
    });

    setTimeout(() => {
      expect(listener).toHaveBeenCalledTimes(2);

      expect(callback).toHaveBeenCalledWith({
        prop1: '',
        prop2: 23,
      });
      done();
    }, 75);

    expect(callback).not.toHaveBeenCalled();
  });

  it('debounced side effects (destroy before end)', () => {
    const store = createStore({ getInitialState, actions });

    const listener = jest.fn();
    const callback = jest.fn((s: State) => {});

    const callbackCancelled = jest.fn();

    store.addStateListener(listener);
    store.setProps({ callback, callbackCancelled });

    const { setSideEffectsDebounced: setDebounced } = store.actions;

    setDebounced(23);
    setDebounced(23);

    store.destroy();
  });

  it('debounced effects (destroy before end)', () => {
    const store = createStore({ getInitialState, actions });

    const listener = jest.fn();
    const callback = jest.fn((s: State) => {});

    const callbackCancelled = jest.fn();

    store.addStateListener(listener);
    store.setProps({ callback, callbackCancelled });

    const { setEffectsDebounced: setDebounced } = store.actions;

    setDebounced(23);
    setDebounced(23);

    store.destroy();
  });
});
