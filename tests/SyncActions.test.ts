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
      getSuccessMessage: () => `prop2`,
    },
    sideEffects: {
      sideEffects: ({ s, p }) => {
        p.callbackSideEffects?.(s);
      },
      getSuccessMessage: () => `sideEffects`,
    },
    setEffectsDebounced: {
      effects: ({ args: [p] }) => ({ prop2: p }),
      sideEffects: ({ s, p }) => {
        p.callback(s);
      },
      debounceTimeout: 50,
      getSuccessMessage: () => `setEffectsDebounced`,
    },
    setSideEffectsDebounced: {
      effects: ({ args: [p] }) => ({ prop2: p }),
      sideEffects: ({ s, p }) => {
        p.callback(s);
      },
      debounceSideEffectsTimeout: 50,
      getSuccessMessage: () => `setSideEffectsDebounced`,
    },
    setSideEffectsDebounced2: {
      effects: ({ args: [p] }) => ({ prop2: p }),
      debounceSideEffectsTimeout: 50,
      getSuccessMessage: () => `setSideEffectsDebounced2`,
    },
    setCancelled: { effects: () => null, sideEffects: ({ p }) => p.callbackCancelled() },
  };

  const getInitialState = (): State => ({
    prop1: '',
    prop2: 0,
  });

  it('works as expected', () => {
    const notifySuccess = jest.fn();

    const store = createStore({ getInitialState, actions, notifySuccess });
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
    expect(notifySuccess).toHaveBeenCalledWith('prop2');

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
    expect(notifySuccess).toHaveBeenCalledTimes(2);
    expect(notifySuccess).toHaveBeenCalledWith('sideEffects');

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

  it('action in sideEffects - do not trigger too many notifyStateListeners', () => {
    const callback = jest.fn();
    const callbackSideEffects = jest.fn();
    const callbackCancelled = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    const actionsImpl: StoreActions<State, Actions, Props> = {
      ...actions,
      setProp2: {
        effects: ({ args: [p] }) => ({ prop2: p }),
        sideEffects: ({ s, a }) => {
          a.setProp1(`sideEffect ${s.prop2}`);
        },
      },
    };

    const store = createStore({
      getInitialState,
      actions: actionsImpl,
      notifySuccess,
      notifyError,
    });

    const listener = jest.fn();

    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackCancelled,
      callbackSideEffects,
    });

    store.actions.setProp2(12);

    // call 1 => init
    // call 2 => 1st + 2nd action effects

    // non optim would be:
    // call 1 => init
    // call 2 => 1st effects
    // call 3 => 2nd effects
    expect(listener).toHaveBeenCalledTimes(2);
    expect(notifyError).not.toHaveBeenCalled();

    expect(store.state).toEqual({
      prop1: `sideEffect 12`,
      prop2: 12,
    });

    expect(callbackCancelled).not.toHaveBeenCalled();
  });

  it('action in sideEffects - no optim if debounced side effects', (done) => {
    const callback = jest.fn();
    const callbackSideEffects = jest.fn();
    const callbackCancelled = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    const actionsImpl: StoreActions<State, Actions, Props> = {
      ...actions,
      setProp1: {
        effects: ({ args: [p] }) => ({ prop1: p }),
      },
      setProp2: {
        effects: ({ args: [p] }) => ({ prop2: p }),
        sideEffects: ({ s, a }) => {
          a.setProp1(`sideEffect ${s.prop2}`);
        },
        debounceSideEffectsTimeout: 50,
      },
    };

    const store = createStore({
      getInitialState,
      actions: actionsImpl,
      notifySuccess,
      notifyError,
    });

    const listener = jest.fn(() => {});

    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackCancelled,
      callbackSideEffects,
    });

    store.actions.setProp2(12);

    setTimeout(() => {
      // call 1 => init
      // call 2 => 1st effects - cannot optimize !
      // call 3 => 2nd effects
      expect(listener).toHaveBeenCalledTimes(3);

      expect(notifyError).not.toHaveBeenCalled();

      expect(store.state).toEqual({
        prop1: `sideEffect 12`,
        prop2: 12,
      });

      expect(callbackCancelled).not.toHaveBeenCalled();
      done();
    }, 100);
  });

  it('debounced side effects', (done) => {
    const notifySuccess = jest.fn();

    const store = createStore({ getInitialState, actions, notifySuccess });

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
      expect(notifySuccess).toHaveBeenCalledWith('setSideEffectsDebounced');
      done();
    }, 75);

    expect(callback).not.toHaveBeenCalled();
  });

  it('debounced no side effects', (done) => {
    const notifySuccess = jest.fn();

    const store = createStore({ getInitialState, actions, notifySuccess });

    const listener = jest.fn();
    const callback = jest.fn((s: State) => {});

    const callbackCancelled = jest.fn();

    store.addStateListener(listener);
    store.setProps({ callback, callbackCancelled });

    const { setSideEffectsDebounced2: setDebounced } = store.actions;

    setDebounced(23);

    setTimeout(() => {
      expect(store.state).toEqual({
        prop1: '',
        prop2: 23,
      });
      expect(notifySuccess).toHaveBeenCalledWith('setSideEffectsDebounced2');
      done();
    }, 75);

    // should not crash
  });

  it('debounced effects', (done) => {
    const notifySuccess = jest.fn();
    const store = createStore({ getInitialState, actions, notifySuccess });

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

      expect(notifySuccess).toHaveBeenCalledWith('setEffectsDebounced');

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
