import { createStore } from '../src';
import { StoreActions, StoreOptions } from '../src/types';

describe('onPropsChange', () => {
  type State = {
    prop1: string;
    prop2: string;
  };

  type Actions = {
    setProp1: () => void;
  };

  type Props = {
    input: string;
    input2: string;
  };

  const actionsImpl: StoreActions<State, Actions, Props> = {
    setProp1: ({ s }) => ({ ...s, prop1: 'test' }),
  };

  function getInitialState(p: Props): State {
    return {
      prop1: p.input,
      prop2: '',
    };
  }

  const options: StoreOptions<State, Actions, Props> = {
    onPropsChange: {
      getDeps: (p) => [p.input],
      effects: ({ s, p }) => ({ ...s, prop1: p.input, prop2: 'changed' }),
    },
  };

  it('values not changing', () => {
    const listener = jest.fn();
    const callback = jest.fn();

    const store = createStore(getInitialState, actionsImpl, {
      onPropsChange: {
        ...options.onPropsChange,
        sideEffects: ({ s }) => {
          callback(s);
        },
      },
    });

    store.addStateListener(listener);
    store.setProps({
      input: 'init',
      input2: '',
    });

    expect(store.state).toEqual({
      prop1: 'init',
      prop2: '',
    });

    store.setProps({
      input: 'init',
      input2: 'newInput',
    });

    expect(store.state).toEqual({
      prop1: 'init',
      prop2: '',
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('values changing (effects + sideEffects)', () => {
    const listener = jest.fn();
    const callback = jest.fn();

    const store = createStore(getInitialState, actionsImpl, {
      onPropsChange: {
        ...options.onPropsChange,
        sideEffects: ({ s }) => {
          callback(s);
        },
      },
    });

    store.addStateListener(listener);
    store.setProps({
      input: 'init',
      input2: '',
    });

    expect(store.state).toEqual({
      prop1: 'init',
      prop2: '',
    });

    store.setProps({
      input: 'newInput',
      input2: 'newInput',
    });

    expect(store.state).toEqual({
      prop1: 'newInput',
      prop2: 'changed',
    });

    expect(callback).toHaveBeenCalledWith({
      prop1: 'newInput',
      prop2: 'changed',
    });
  });

  it('values changing, no effects', () => {
    const listener = jest.fn();
    const callback = jest.fn();

    const store = createStore(getInitialState, actionsImpl, {
      onPropsChange: {
        getDeps: options.onPropsChange.getDeps,
        sideEffects: callback,
      },
    });

    store.addStateListener(listener);
    store.setProps({
      input: 'init',
      input2: '',
    });

    expect(store.state).toEqual({
      prop1: 'init',
      prop2: '',
    });

    store.setProps({
      input: 'newInput',
      input2: 'newInput',
    });

    expect(store.state).toEqual({
      prop1: 'init',
      prop2: '',
    });

    expect(callback).toHaveBeenCalled();
  });

  it('values changing, no side effects', () => {
    const listener = jest.fn();

    const store = createStore(getInitialState, actionsImpl, {
      onPropsChange: {
        ...options.onPropsChange,
      },
    });

    store.addStateListener(listener);
    store.setProps({
      input: 'init',
      input2: '',
    });

    expect(store.state).toEqual({
      prop1: 'init',
      prop2: '',
    });

    store.setProps({
      input: 'newInput',
      input2: 'newInput',
    });

    expect(store.state).toEqual({
      prop1: 'newInput',
      prop2: 'changed',
    });
  });

  it('unstable getDeps', () => {
    const listener = jest.fn();

    let count = 0;

    const options: StoreOptions<State, Actions, Props> = {
      onPropsChange: {
        getDeps: (p) => (count++ % 2 ? [p.input] : [false, p.input]),
        effects: ({ s, p }) => ({ ...s, prop1: p.input, prop2: 'changed' }),
      },
    };

    const store = createStore(getInitialState, actionsImpl, {
      onPropsChange: {
        ...options.onPropsChange,
      },
    });

    const oldLog = console.warn;
    console.warn = jest.fn();

    store.addStateListener(listener);
    store.setProps({
      input: 'init',
      input2: '',
    });

    expect(store.state).toEqual({
      prop1: 'init',
      prop2: '',
    });

    store.setProps({
      input: 'newInput',
      input2: 'newInput',
    });

    expect(store.state).toEqual({
      prop1: 'newInput',
      prop2: 'changed',
    });

    expect(console.warn).toHaveBeenCalled();

    console.warn = oldLog;
  });
});
