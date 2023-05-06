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

  const actions: StoreActions<State, Actions, Props> = {
    setProp1: () => ({ prop1: 'test' }),
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
      effects: ({ p }) => ({ prop1: p.input, prop2: 'changed' }),
    },
  };

  it('values not changing', () => {
    const listener = jest.fn();
    const callback = jest.fn();

    const store = createStore<State, Actions, Props>({
      getInitialState,
      actions: actions,
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

    const store = createStore({
      getInitialState,
      actions,
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

    const store = createStore({
      getInitialState,
      actions: actions,
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

    const store = createStore({
      getInitialState,
      actions: actions,
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
        effects: ({ p }) => ({ prop1: p.input, prop2: 'changed' }),
      },
    };

    const store = createStore({
      getInitialState,
      actions: actions,
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

  describe('multiple prop changes', () => {
    it('2 props changes, effects cumulating + side effects (at the end)', () => {
      const callback = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      let count = 0;

      type DerivedState = {
        derived: string;
      };

      const options: StoreOptions<State, Actions, Props, DerivedState> = {
        derivedState: {
          derived: {
            getDeps: ({ s }) => [s.prop1, s.prop2],
            get: ({ s }) => `${s.prop1}&${s.prop2}`,
          },
        },
        onPropsChange: [
          {
            getDeps: (p) => [p.input],
            effects: ({ p }) => ({ prop1: p.input }),
            sideEffects: ({ s, indices }) => {
              callback(`${s.prop1}-${s.prop2}`, indices);
            },
          },
          {
            getDeps: (p) => [p.input2],
            effects: ({ p }) => ({ prop2: p.input2 }),
            sideEffects: ({ s }) => {
              callback2(`${s.prop1}-${s.prop2}`);
            },
          },
          {
            getDeps: (p) => [p.input2, p.input],
            effects: ({ s }) => ({ prop1: `${s.prop1}_2`, prop2: `${s.prop2}_2` }),
            sideEffects: ({ s, indices }) => {
              callback3(`${s.prop1}-${s.prop2}`, indices);
            },
          },
        ],
      };

      const store = createStore({ getInitialState, actions: actions, ...options });

      store.init({
        input: '',
        input2: '',
      });

      store.setProps({
        input: 'test',
        input2: '',
      });

      expect(store.state).toEqual({
        prop1: 'test_2',
        prop2: '_2',
        derived: `test_2&_2`,
      });

      // side effects are executed after all effects
      expect(callback).toHaveBeenCalledWith(`test_2-_2`, [0]);
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).toHaveBeenCalledWith(`test_2-_2`, [1]);
    });

    it('2 props changes (not effects/side effects)', () => {
      const callback = jest.fn();
      const callback2 = jest.fn();

      let count = 0;

      type DerivedState = {
        derived: string;
      };

      const options: StoreOptions<State, Actions, Props, DerivedState> = {
        derivedState: {
          derived: {
            getDeps: ({ s }) => [s.prop1, s.prop2],
            get: ({ s }) => `${s.prop1}&${s.prop2}`,
          },
        },
        onPropsChange: [
          {
            getDeps: (p) => [p.input],
            sideEffects: ({ s }) => {
              callback(`${s.prop1}-${s.prop2}`);
            },
          },
          {
            getDeps: (p) => [p.input2],
            effects: ({ p }) => ({ prop2: p.input2 }),
            sideEffects: ({ s }) => {
              callback2(`${s.prop1}-${s.prop2}`);
            },
          },
          {
            getDeps: (p) => [p.input, p.input2],
            effects: ({ s }) => ({ prop1: `${s.prop1}_2`, prop2: `${s.prop2}_2` }),
          },
        ],
      };

      const store = createStore({ getInitialState, actions, ...options });

      store.init({
        input: '',
        input2: '',
      });

      store.setProps({
        input: 'test',
        input2: '',
      });

      expect(store.state).toEqual({
        prop1: '_2',
        prop2: '_2',
        derived: `_2&_2`,
      });

      // side effects are executed after all effects
      expect(callback).toHaveBeenCalledWith(`_2-_2`);
      expect(callback2).not.toHaveBeenCalled();
    });
  });
});
