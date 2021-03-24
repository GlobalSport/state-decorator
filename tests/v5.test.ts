import { ConflictPolicy, StoreActions, StoreOptions } from '../src';
import useStateDecorator, {
  StateDecoratorActions,
  StateDecoratorOptions,
  testV6AdvancedSyncAction,
  testV6AsyncAction,
  testV6SyncAction,
} from '../src/v5';
import { getFailedTimeoutPromise, getTimeoutPromise } from './utils';
import { renderHook, act } from '@testing-library/react-hooks';

describe('v5 compatibility layer', () => {
  type State = {
    propSimpleSync: string;
    propSync: string;
    propAsync: string;
    propAsyncParallel: Record<string, string>;
    propOptimistic: string;
    propError: string;
    propProps: string;
  };

  type Actions = {
    setSimpleSync: (v: string) => void;
    setSync: (v: string) => void;
    setAsync: (v: string) => Promise<string>;
    setAsyncFail: (v: string) => Promise<string>;
    setAsyncParallel: (v: string, key: string, fail: boolean, timeout: number) => Promise<string>;
  };

  type Props = {
    propIn: string;
    callback: (msg?: string) => void;
  };

  const v6actions: StoreActions<State, Actions, Props> = {
    setSimpleSync: ({ s, args: [v] }) => ({ ...s, propSimpleSync: v }),
    setSync: {
      effects: ({ s, args: [v] }) => ({ ...s, propSync: v }),
      sideEffects: ({ p }) => {
        p.callback?.();
      },
    },
    setAsync: {
      preEffects: ({ s }) => ({ ...s, propAsync: 'pre' }),
      getGetPromise: ({ args: [v] }) => Promise.resolve(v),
      effects: ({ s, res }) => ({ ...s, propAsync: res }),
      errorEffects: ({ s, err }) => ({ ...s, propAsync: err.message }),
      sideEffects: ({ p }) => {
        p.callback?.();
      },
      errorSideEffects: ({ p, err }) => {
        p.callback?.(err.message);
      },
      getSuccessMessage: ({ args }) => `${args} OK!`,
      getErrorMessage: ({ err }) => `${err.message}`,
    },
    setAsyncFail: {
      getPromise: () => Promise.reject(new Error('boom')),
      errorEffects: ({ s, err }) => ({ ...s, propAsync: err.message }),
      errorSideEffects: () => {},
    },
    setAsyncParallel: {
      conflictPolicy: ConflictPolicy.PARALLEL,
      getPromiseId: (_, k) => k,
      getPromise: ({ args: [v, , willFail, timeout], promiseId }) =>
        willFail ? getFailedTimeoutPromise(timeout, new Error('error'), promiseId) : getTimeoutPromise(timeout, v),
      optimisticEffects: ({ s, args: [v, k], promiseId }) => ({
        ...s,
        propAsyncParallel: {
          ...s.propAsyncParallel,
          [promiseId]: v,
        },
      }),
      errorEffects: ({ s, promiseId }) => ({
        ...s,
        propAsyncParallel: { ...s.propAsyncParallel, [promiseId]: 'error' },
      }),
    },
  };

  const v5actions: StateDecoratorActions<State, Actions, Props> = {
    setSimpleSync: (s, [v]) => ({ ...s, propSimpleSync: v }),
    setSync: {
      action: (s, [v]) => ({ ...s, propSync: v }),
      onActionDone: (s, _, p, a) => {
        p.callback?.();
      },
    },
    setAsync: {
      preReducer: (s) => ({ ...s, propAsync: 'pre' }),
      promiseGet: ([v]) => Promise.resolve(v),
      reducer: (s, res) => ({ ...s, propAsync: res }),
      errorReducer: (s, err) => ({ ...s, propAsync: err.message }),
      onDone: (s, res, args, p) => {
        p.callback?.();
      },
      onFail: (s, err, args, p) => {
        p.callback?.(err.message);
      },
      getSuccessMessage: (res, args) => `${args} OK!`,
      getErrorMessage: (err) => `${err.message}`,
    },
    setAsyncFail: {
      promise: () => Promise.reject(new Error('boom')),
      errorReducer: (s, err) => ({ ...s, propAsync: err.message }),
      onFail: () => {},
    },
    setAsyncParallel: {
      conflictPolicy: ConflictPolicy.PARALLEL,
      getPromiseId: (_, k) => k,
      promise: ([v, k, willFail, timeout], s, p) =>
        willFail ? getFailedTimeoutPromise(timeout, new Error('error'), k) : getTimeoutPromise(timeout, v),
      optimisticReducer: (s, [v, k]) => ({
        ...s,
        propAsyncParallel: {
          ...s.propAsyncParallel,
          [k]: v,
        },
      }),
      errorReducer: (s, err, [v, k]) => ({
        ...s,
        propAsyncParallel: { ...s.propAsyncParallel, [k]: 'error' },
      }),
      successMessage: 'success',
      errorMessage: 'error',
    },
  };

  const v6options: StoreOptions<State, Actions, Props, any> = {
    notifySuccess: jest.fn(),
    notifyError: jest.fn(),
    onPropsChange: {
      getDeps: (p) => [p.propIn],
      effects: ({ s, p }) => ({ ...s, propProps: p.propIn }),
      sideEffects: ({ a }) => {
        a.setAsync('value');
      },
    },
  };

  const v5options: StateDecoratorOptions<State, Actions, Props> = {
    notifyError: jest.fn(),
    notifySuccess: jest.fn(),
    onMount: jest.fn(),
    getPropsRefValues: (p) => [p.propIn],
    onPropsChangeReducer: (s, p) => ({ ...s, propProps: p.propIn }),
    onPropsChange: (s, p, a) => {
      a.setAsync('value');
    },
  };

  const getInitialState = (): State => ({
    propProps: '',
    propSync: '',
    propSimpleSync: '',
    propAsync: '',
    propAsyncParallel: {},
    propOptimistic: '',
    propError: '',
  });

  it('useStateDecorator hook works as expected', async () => {
    const { result, rerender } = renderHook(
      (props) => useStateDecorator(getInitialState, v5actions, props as any, v5options),
      { initialProps: { propIn: '', callback: jest.fn() } }
    );
    expect(result.current.state).toEqual({
      propProps: '',
      propSync: '',
      propSimpleSync: '',
      propAsync: '',
      propAsyncParallel: {},
      propOptimistic: '',
      propError: '',
    });
    act(() => {
      result.current.actions.setSimpleSync('v1');
    });
    expect(result.current.state.propSimpleSync).toEqual('v1');

    act(() => {
      result.current.actions.setSync('v2');
    });
    expect(result.current.state.propSync).toEqual('v2');

    await act(async () => result.current.actions.setAsync('v3'));

    expect(result.current.state.propAsync).toEqual('v3');

    await act(async () => result.current.actions.setAsyncFail('v3'));

    expect(result.current.state.propAsync).toEqual('boom');

    await act(async () => result.current.actions.setAsyncParallel('v4', 'k1', false, 50));

    expect(result.current.state.propAsyncParallel).toEqual({ k1: 'v4' });

    // make warning
    // act(() => {
    //   rerender({ propIn: 'propInChange' });
    // });
  });

  describe('test v6 to v5', () => {
    it('simple action', async () => {
      await testV6SyncAction(v6actions.setSimpleSync, (action) => {
        const state = getInitialState();
        const newState = action(state, ['v1'], {});
        expect(newState.propSimpleSync).toEqual('v1');
      });
    });

    it('sync action', async () => {
      await testV6AdvancedSyncAction(v6actions.setSync, (action) => {
        const state = getInitialState();
        const newState = action.action(state, ['v2'], {});
        expect(newState.propSync).toEqual('v2');

        const props: Props = {
          propIn: '',
          callback: jest.fn(),
        };

        action.onActionDone(state, [], props, null, null);
        expect(props.callback).toHaveBeenCalled();
      });
    });

    it('async action', async () => {
      await testV6AsyncAction(v6actions.setAsync, (action) => {
        const state = getInitialState();

        const newState = action.reducer(state, 'v3', ['v3'], {});
        expect(newState.propAsync).toEqual('v3');

        const newState2 = action.errorReducer(state, new Error('boom'), ['v3'], {});
        expect(newState2.propAsync).toEqual('boom');

        action['promiseGet']('test');

        const props: Props = {
          propIn: '',
          callback: jest.fn(),
        };

        action.onDone(state, 'v3', [], props, null, null);
        expect(props.callback).toHaveBeenCalled();

        const props2: Props = {
          propIn: '',
          callback: jest.fn(),
        };

        action.onFail(state, new Error('boom2'), [], props2, null, null);
        expect(props2.callback).toHaveBeenCalledWith('boom2');

        const errMsg = action.getErrorMessage(new Error('boom'), ['v', 'k', false, 10], {});
        expect(errMsg).toEqual('boom');

        const successMsg = action.getSuccessMessage(state, ['v', 'k', false, 10], {});
        expect(successMsg).toEqual('v,k,false,10 OK!');
      });
    });

    it('async action (edge cases)', async () => {
      await testV6AsyncAction(v6actions.setAsyncParallel, (action) => {
        const state = getInitialState();

        action['promise']('test');

        const newState = action.optimisticReducer(state, ['v4', 'k1', false, 0], {});
        expect(newState.propAsyncParallel).toEqual({ k1: 'v4' });
      });

      let failed1 = false;
      let failed2 = false;
      let failed3 = false;
      await testV6SyncAction(v6actions.setAsync, (action) => {}).catch((e) => {
        failed1 = true;
      });
      await testV6AdvancedSyncAction(v6actions.setAsync, (action) => {}).catch((e) => {
        failed2 = true;
      });
      await testV6AsyncAction(v6actions.setSync, (action) => {}).catch((e) => {
        failed3 = true;
      });

      expect(failed1).toBeTruthy();
      expect(failed2).toBeTruthy();
      expect(failed3).toBeTruthy();
    });

    it('async action (missing reducers)', async () => {
      type State = { prop: string };
      type Actions = { setProp: () => void; setProp2: () => void };
      const actions: StoreActions<State, Actions> = {
        setProp: {
          getPromise: () => Promise.resolve(),
        },
        setProp2: {
          getGetPromise: () => Promise.resolve(),
        },
      };

      await testV6AsyncAction(actions.setProp, (action) => {
        const state: State = { prop: '' };

        let newState: State;
        newState = action.preReducer(state, [], {});
        expect(newState).toBeNull();

        newState = action.optimisticReducer(state, [], {});
        expect(newState).toBeNull();

        newState = action.reducer(state, 'test', [], {});
        expect(newState).toBeNull();

        newState = action.errorReducer(state, new Error(), [], {});
        expect(newState).toBeNull();

        action.onDone(state, null, [], {});
        action.onFail(state, null, [], {});
        action.getSuccessMessage(state, null, [], {});
        action.getErrorMessage(state, null, [], {});
        action.promiseGet();
        action.promise();
      });

      await testV6AsyncAction(actions.setProp2, (action) => {
        const state: State = { prop: '' };

        let newState: State;
        newState = action.preReducer(state, [], {});
        expect(newState).toBeNull();

        newState = action.optimisticReducer(state, [], {});
        expect(newState).toBeNull();

        newState = action.reducer(state, 'test', [], {});
        expect(newState).toBeNull();

        newState = action.errorReducer(state, new Error(), [], {});
        expect(newState).toBeNull();

        action.onDone(state, null, [], {});
        action.onFail(state, null, [], {});
        action.getSuccessMessage(state, null, [], {});
        action.getErrorMessage(state, null, [], {});
        action.promiseGet();
        action.promise();
      });
    });
  });
});
