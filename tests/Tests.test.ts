import { StoreActions, StoreOptions } from '../src/types';
import { createMockStore, setMockFactory } from '../src/test';

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
    setOptimistic: (p: string) => Promise<string>;
  };

  type Props = {
    prop: string;
    prop2: string;
  };

  type DerivedState = {
    concat: string;
  };

  const actionsImpl: StoreActions<State, Actions, Props> = {
    setProp1: ({ s, args: [v] }) => ({ ...s, prop1: v }),
    setProp2: {
      effects: ({ s, args: [v] }) => ({ ...s, prop2: v }),
      sideEffects: ({ a }) => {
        a.setProp1('sideEffect');
      },
    },
    setProp3: {
      rejectPromiseOnError: true,
      getPromise: ({ args: [param, fail] }) => (fail ? Promise.reject(new Error('boom')) : Promise.resolve(param)),
      effects: ({ s, res }) => ({ ...s, prop3: res }),
      errorEffects: ({ s, err }) => ({ ...s, error: err.message }),
      sideEffects: ({ a }) => {
        a.setProp1('sideEffect');
      },
      errorSideEffects: ({ a }) => {
        a.setProp1('errorSideEffect');
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
  };

  const store = createMockStore(
    () => ({
      prop1: '',
      prop2: 0,
      prop3: '',
      prop4: '',
      error: '',
    }),
    actionsImpl,
    { prop: '', prop2: '' },
    options
  );

  it('allows to set state correctly', () => {
    store.test((s) => {
      expect(s).toEqual({
        prop1: '',
        prop2: 0,
        prop3: '',
        prop4: '',
        error: '',
        concat: ',0,,,', // derived state is included
      });
    });

    const newStore = store.setState({
      prop1: 'a',
      prop2: 0,
      prop3: 'c',
      prop4: 'd',
      error: 'e',
    });

    expect(newStore).not.toBe(store);

    const newStore2 = store.setPartialState({
      prop1: 'a',
    });

    expect(newStore2).not.toBe(store);

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
    store.test((s) => {
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

  it('allows to set props correctly', () => {
    store.test((s, props) => {
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
      });
    });

    const newStore = store.setProps({
      prop: 'a',
      prop2: '',
    });

    expect(newStore).not.toBe(store);

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
      });
    });

    const newStore2 = store.setPartialProps({
      prop: 'a',
    });

    expect(newStore2).not.toBe(store);

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
      });
    });

    // unchanged
    store.test((s) => {
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

  it('allows to test prop change', () => {
    store
      .onPropsChange({
        prop: 'new_prop',
        prop2: '',
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

  it('allows to test sync action', async () => {
    const action = store.getAction('setProp1');

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

  it('allows to test advanced sync action', async () => {
    await store
      .getAction('setProp2')
      .call(42)
      .then((res) => {
        expect(res.actions.setProp1).toHaveBeenCalledWith('sideEffect');
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
    await store
      .getAction('setProp3')
      .call('new value', false)
      .then((res) => {
        expect(res.actions.setProp1).toHaveBeenCalledWith('sideEffect');
        expect(res.state).toEqual({
          prop1: '',
          prop2: 0,
          prop3: 'new value',
          prop4: '',
          error: '',
          concat: ',0,new value,,', // derived state is included
        });
      });

    await store
      .getAction('setProp3')
      .call('new value', true)
      .then((res) => {
        expect(res.actions.setProp1).toHaveBeenCalledWith('errorSideEffect');
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
    await store
      .getAction('setProp3')
      .promiseResolves('override')
      .call('new value', false)
      .then((res) => {
        expect(res.actions.setProp1).toHaveBeenCalledWith('sideEffect');
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

    await store
      .getAction('setProp3')
      .promiseRejects(new Error('override'))
      .call('new value', false)
      .then((res) => {
        expect(res.actions.setProp1).toHaveBeenCalledWith('errorSideEffect');
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
    const action = store.getAction('setOptimistic');

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
    const action = store.getAction('setProp1');

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

  it('allows to props on store mock action', async () => {
    const action = store.getAction('setProp1');

    const action2 = action
      .setProps({
        prop: 'p',
        prop2: '',
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
});
