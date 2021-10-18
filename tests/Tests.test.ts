import { StoreActions, StoreOptions } from '../src/types';
import { createMockStore, setMockFactory, createMockFromStore } from '../src/test';
import { createStore } from '../src';

describe('createMockStore', () => {
  type State = {
    prop1: string;
    prop2: number;
    prop3: string;
    prop4: string;
    error: string;
  };

  type Actions = {
    setProp1: (p: string) => void;
    setProp2: (p: number) => void;
    setProp3: (p: string, willFail: boolean) => Promise<string>;
    setProp4: (p: string) => void;
    setOptimistic: (p: string) => Promise<string>;
  };

  type Props = {
    prop: string;
    prop2: string;
    onMount: () => void;
  };

  type DerivedState = {
    concat: string;
  };

  const actionsImpl: StoreActions<State, Actions, Props> = {
    setProp1: ({ s, args: [v] }) => ({ ...s, prop1: v }),
    setProp4: ({ s, args: [v] }) => ({ ...s, prop4: v }),
    setProp2: {
      effects: ({ s, args: [v] }) => ({ ...s, prop2: v }),
      sideEffects: ({ a, s }) => {
        a.setProp1(`sideEffect ${s.prop2}`);
      },
    },
    setProp3: {
      rejectPromiseOnError: true,
      getPromise: ({ args: [param, fail] }) => (fail ? Promise.reject(new Error('boom')) : Promise.resolve(param)),
      effects: ({ s, res }) => ({ ...s, prop3: res }),
      errorEffects: ({ s, err }) => ({ ...s, error: err.message }),
      sideEffects: ({ a, s }) => {
        a.setProp1(`sideEffect ${s.prop3}`);
      },
      errorSideEffects: ({ a, s }) => {
        a.setProp1(`errorSideEffect ${s.prop3}`);
      },
    },
    setOptimistic: {
      getPromise: ({ args: [param] }) => Promise.resolve(param),
      optimisticEffects: ({ s, args: [param] }) => ({ ...s, prop1: param }),
    },
  };

  const options: StoreOptions<State, Actions, Props, DerivedState> = {
    onPropsChange: {
      getDeps: (p) => [p.prop],
      effects: ({ s, p }) => ({ ...s, prop1: p.prop }),
      sideEffects: ({ p, a }) => {
        a.setProp1(p.prop);
      },
    },
    derivedState: {
      concat: {
        getDeps: ({ s, p }) => [s.prop1, s.prop2, s.prop3, s.prop4, p.prop],
        get: ({ s, p }) => [s.prop1, s.prop2, s.prop3, s.prop4, p.prop].join(','),
      },
    },
    onMount: ({ a, p }) => {
      a.setProp1('onMount1');
      p.onMount();
    },
  };

  function getInitialState(): State {
    return {
      prop1: '',
      prop2: 0,
      prop3: '',
      prop4: '',
      error: '',
    };
  }

  const mockStore = createMockStore(getInitialState, actionsImpl, { prop: '', prop2: '', onMount: null }, options);

  const store = createStore(getInitialState, actionsImpl, options);
  const mockStore2 = createMockFromStore(store, { prop: '', prop2: '', onMount: null });

  it('allows to set state correctly', () => {
    const test = (mockStore) => {
      mockStore.test((s) => {
        expect(s).toEqual({
          prop1: '',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: '',
          concat: ',0,,,', // derived state is included
        });
      });

      const newStore = mockStore.setState({
        prop1: 'a',
        prop2: 0,
        prop3: 'c',
        prop4: 'd',
        error: 'e',
      });

      expect(newStore).not.toBe(mockStore);

      const newStore2 = mockStore.setPartialState({
        prop1: 'a',
      });

      expect(newStore2).not.toBe(mockStore);

      newStore2.test((s) => {
        expect(s).toEqual({
          prop1: 'a',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: '',
          concat: 'a,0,,,', // derived state is included
        });
      });

      // unchanged
      mockStore.test((s) => {
        expect(s).toEqual({
          prop1: '',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: '',
          concat: ',0,,,', // derived state is included
        });
      });
    };

    test(mockStore);
    test(mockStore2);
  });

  it('allows to set props correctly', () => {
    mockStore.test((s, props) => {
      expect(s).toEqual({
        prop1: '',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
        concat: ',0,,,', // derived state is included
      });

      expect(props).toEqual({
        prop: '',
        prop2: '',
        onMount: null,
      });
    });

    const newStore = mockStore.setPartialProps({
      prop: 'a',
      prop2: '',
    });

    expect(newStore).not.toBe(mockStore);

    newStore.test((s, props) => {
      expect(s).toEqual({
        prop1: '',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
        concat: ',0,,,a', // derived state is updated
      });

      expect(props).toEqual({
        prop: 'a',
        prop2: '',
        onMount: null,
      });
    });

    const newStore2 = mockStore.setPartialProps({
      prop: 'a',
    });

    expect(newStore2).not.toBe(mockStore);

    newStore2.test((s, props) => {
      expect(s).toEqual({
        prop1: '',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
        concat: ',0,,,a', // derived state is updated
      });

      expect(props).toEqual({
        prop: 'a',
        prop2: '',
        onMount: null,
      });
    });

    // unchanged
    mockStore.test((s) => {
      expect(s).toEqual({
        prop1: '',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
        concat: ',0,,,', // derived state is included
      });
    });
  });

  describe('onPropsChange', () => {
    it('allows to test prop change', () => {
      mockStore
        .onPropsChange({
          prop: 'new_prop',
          prop2: '',
          onMount: null,
        })
        .test((res) => {
          expect(res.actions.setProp1).toHaveBeenCalled();
          expect(res.props.prop).toEqual('new_prop');
          expect(res.state).toEqual({
            prop1: 'new_prop',
            prop2: 0,
            prop3: '',
            prop4: '',
            error: '',
            concat: 'new_prop,0,,,new_prop', // derived state is updated
          });
        });
    });

    it('allows to test several prop change', () => {
      const optionsPropsChange: StoreOptions<State, Actions, Props, DerivedState> = {
        onPropsChange: [
          {
            getDeps: (p) => [p.prop],
            effects: ({ s, p }) => ({ ...s, prop1: p.prop }),
            sideEffects: ({ p, a }) => {
              a.setProp1(p.prop);
            },
          },
          {
            getDeps: (p) => [p.prop2],
            effects: ({ s, p }) => ({ ...s, prop3: p.prop2 }),
            sideEffects: ({ p, a }) => {
              a.setProp4(p.prop2);
            },
            onMount: true,
          },
        ],
        derivedState: {
          concat: {
            getDeps: ({ s, p }) => [s.prop1, s.prop2, s.prop3, s.prop4, p.prop],
            get: ({ s, p }) => [s.prop1, s.prop2, s.prop3, s.prop4, p.prop].join(','),
          },
        },
      };

      const mockStore = createMockStore(
        getInitialState,
        actionsImpl,
        { prop: '', prop2: '', onMount: null },
        optionsPropsChange
      );

      mockStore
        .onPropsChange(
          {
            prop: 'new_prop',
            prop2: 'new_prop2',
            onMount: null,
          },
          true
        )
        .test((res) => {
          expect(res.actions.setProp1).not.toHaveBeenCalled();
          expect(res.actions.setProp2).not.toHaveBeenCalled();
          expect(res.actions.setProp3).not.toHaveBeenCalled();
          expect(res.actions.setProp4).toHaveBeenCalled();
          expect(res.props.prop).toEqual('new_prop');
          expect(res.state).toEqual({
            prop1: '',
            prop2: 0,
            prop3: 'new_prop2',
            prop4: '',
            error: '',
            concat: ',0,new_prop2,,new_prop', // derived state is updated
          });
        });

      mockStore
        .onPropsChange(
          {
            prop: 'new_prop',
            prop2: 'new_prop2',
            onMount: null,
          },
          false
        )
        .test((res) => {
          expect(res.actions.setProp1).toHaveBeenCalled();
          expect(res.actions.setProp2).not.toHaveBeenCalled();
          expect(res.actions.setProp3).not.toHaveBeenCalled();
          expect(res.actions.setProp4).toHaveBeenCalled();
          expect(res.props.prop).toEqual('new_prop');
          expect(res.state).toEqual({
            prop1: 'new_prop',
            prop2: 0,
            prop3: 'new_prop2',
            prop4: '',
            error: '',
            concat: 'new_prop,0,new_prop2,,new_prop', // derived state is updated
          });
        });
    });
  });

  it('allows to test sync action', async () => {
    const action = mockStore.getAction('setProp1');

    await action.call('new value').then((ctx) => {
      expect(ctx.state).toEqual({
        prop1: 'new value',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
        concat: 'new value,0,,,', // derived state is included
      });
    });

    await action
      .test((s) => {
        // some tests can be inserted
        // initial value, no side effect of previous call
        expect(s).toEqual({
          prop1: '',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: '',
          concat: ',0,,,',
        });
      })
      .setState({
        prop1: 'test',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
      })
      .test((s) => {
        // some tests can be inserted
        expect(s.prop1).toEqual('test');
      })
      .call('new value')
      .then((res) => {
        expect(res.state).toEqual({
          prop1: 'new value',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: '',
          concat: 'new value,0,,,', // derived state is included
        });
      });
  });

  it('allows to test advanced sync action (+side effects)', async () => {
    await mockStore
      .getAction('setProp2')
      .call(42)
      .then((res) => {
        expect(res.actions.setProp1).toHaveBeenCalledWith('sideEffect 42');
        expect(res.state).toEqual({
          prop1: '',
          prop2: 42,
          prop3: '',
          prop4: '',
          error: '',
          concat: ',42,,,', // derived state is included
        });
      });
  });

  it('allows to test asynchronous action (use promise impl)', async () => {
    await mockStore
      .getAction('setProp3')
      .call('new value', false)
      .then((res) => {
        expect(res.actions.setProp1).toHaveBeenCalledWith('sideEffect new value');
        expect(res.state).toEqual({
          prop1: '',
          prop2: 0,
          prop3: 'new value',
          prop4: '',
          error: '',
          concat: ',0,new value,,', // derived state is included
        });
      });

    await mockStore
      .getAction('setProp3')
      .call('new value', true)
      .then((res) => {
        expect(res.actions.setProp1).toHaveBeenCalledWith('errorSideEffect ');
        expect(res.state).toEqual({
          prop1: '',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: 'boom',
          concat: ',0,,,', // derived state is included
        });
      });
  });

  it('allows to test asynchronous action, (override promise resolve)', async () => {
    await mockStore
      .getAction('setProp3')
      .promiseResolves('override')
      .call('new value', false)
      .then((res) => {
        expect(res.actions.setProp1).toHaveBeenCalledWith('sideEffect override');
        expect(res.state).toEqual({
          prop1: '',
          prop2: 0,
          prop3: 'override',
          prop4: '',
          error: '',
          concat: ',0,override,,', // derived state is included
        });
      });
  });

  it('allows to test asynchronous action, (override promise rejects)', async () => {
    setMockFactory((impl) => jest.fn(impl));

    await mockStore
      .getAction('setProp3')
      .promiseRejects(new Error('override'))
      .call('new value', false)
      .then((res) => {
        expect(res.actions.setProp1).toHaveBeenCalledWith('errorSideEffect ');
        expect(res.state).toEqual({
          prop1: '',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: 'override',
          concat: ',0,,,', // derived state is included
        });
      });
  });

  it('allows to test optimistic action', async () => {
    const action = mockStore.getAction('setOptimistic');

    await action.call('new value').then((res) => {
      expect(res.state).toEqual({
        prop1: 'new value',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
        concat: 'new value,0,,,', // derived state is included
      });
    });

    await action
      .promiseRejects(new Error('booom'))
      .test((s) => {
        expect(s).toEqual({
          prop1: '',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: '',
          concat: ',0,,,', // derived state is included
        });
      })
      .call('new value')
      .then((res) => {
        expect(res.state).toEqual({
          prop1: '',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: '',
          concat: ',0,,,', // derived state is included
        });
      });
  });

  it('allows to state on store mock action', async () => {
    const action = mockStore.getAction('setProp1');

    const action2 = action
      .setState({
        prop1: 'a',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
      })
      .test((s) => {
        expect(s).toEqual({
          prop1: 'a',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: '',
          concat: 'a,0,,,', // derived state is included
        });
      });

    expect(action).not.toBe(action2);

    action.test((s) => {
      expect(s).toEqual({
        prop1: '',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
        concat: ',0,,,', // derived state is included
      });
    });

    // setParialState

    const action3 = action
      .setPartialState({
        prop1: 'a',
      })
      .test((s) => {
        expect(s).toEqual({
          prop1: 'a',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: '',
          concat: 'a,0,,,', // derived state is included
        });
      });

    expect(action).not.toBe(action3);

    action.test((s) => {
      expect(s).toEqual({
        prop1: '',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
        concat: ',0,,,', // derived state is included
      });
    });
  });

  it('allows to set props on store mock action', async () => {
    const action = mockStore.getAction('setProp1');

    const action2 = action
      .setProps({
        prop: 'p',
        prop2: '',
        onMount: null,
      })
      .test((s) => {
        expect(s).toEqual({
          prop1: '',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: '',
          concat: ',0,,,p', // derived state is included
        });
      });

    expect(action).not.toBe(action2);

    action.test((s) => {
      expect(s).toEqual({
        prop1: '',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
        concat: ',0,,,', // derived state is included
      });
    });

    // setParialState

    const action3 = action
      .setPartialProps({
        prop: 'p',
      })
      .test((s) => {
        expect(s).toEqual({
          prop1: '',
          prop2: 0,
          prop3: '',
          prop4: '',
          error: '',
          concat: ',0,,,p', // derived state is included
        });
      });

    expect(action).not.toBe(action3);

    action.test((s) => {
      expect(s).toEqual({
        prop1: '',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
        concat: ',0,,,', // derived state is included
      });
    });
  });

  describe('onMount', () => {
    it('allows to test onMount on store', () => {
      mockStore.onMount(
        {
          prop: '',
          prop2: '',
          onMount: jest.fn(),
        },
        (p, a) => {
          expect(p.onMount).toHaveBeenCalled();
          expect(a.setProp1).toHaveBeenCalledWith('onMount1');
        }
      );
    });

    it('fails if no onMount is set on options', () => {
      const store = createMockStore(
        getInitialState,
        actionsImpl,
        {
          prop: '',
          prop2: '',
          onMount: jest.fn(),
        },
        null
      );

      try {
        store.onMount(
          {
            prop: '',
            prop2: '',
            onMount: jest.fn(),
          },
          (p, a) => {
            expect(p.onMount).toHaveBeenCalled();
            expect(a.setProp1).toHaveBeenCalledWith('onMount1');
          }
        );

        throw new Error('failed');
      } catch (e) {
        if (e.message === 'failed') {
          throw new Error('failed');
        }
      }
    });
  });
});
