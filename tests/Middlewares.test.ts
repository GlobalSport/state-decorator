import { StoreActions, StoreOptions, createStore, ConflictPolicy } from '../src';
import { logEffects, logDetailedEffects, Logger } from '../src/middlewares';

function getFailedTimeoutPromise(timeout: number, err: Error = null, id: string): Promise<string> {
  return new Promise((_, rej) => {
    setTimeout(rej, timeout, err);
  });
}

function getTimeoutPromise<C>(timeout: number, result: C = null): Promise<C> {
  return new Promise((res) => {
    setTimeout(res, timeout, result);
  });
}

describe('middlewares', () => {
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
    setAsyncParallel: (v: string, key: string, fail: boolean, timeout: number) => Promise<string>;
    setOptimisticSuccess: (v: string) => Promise<string>;
    setOptimisticFail: (v: string) => Promise<string>;
  };

  type Props = {
    propIn: string;
  };

  const actions: StoreActions<State, Actions, Props> = {
    setSimpleSync: ({ s, args: [v] }) => ({ ...s, propSimpleSync: v }),
    setSync: { effects: ({ s, args: [v] }) => ({ ...s, propSync: v }) },
    setAsync: {
      getPromise: ({ args: [v] }) => Promise.resolve(v),
      effects: ({ s, res }) => ({ ...s, propAsync: res }),
    },
    setAsyncParallel: {
      conflictPolicy: ConflictPolicy.PARALLEL,
      getPromiseId: (_, k) => k,
      getPromise: ({ args: [v, , willFail, timeout], promiseId }) =>
        willFail ? getFailedTimeoutPromise(timeout, new Error('error'), promiseId) : getTimeoutPromise(timeout, v),
      optimisticEffects: ({ s, args: [v], promiseId }) => ({
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
    setOptimisticSuccess: {
      getPromise: ({ args: [v] }) => Promise.resolve(v),
      optimisticEffects: ({ s, args: [v] }) => ({
        ...s,
        propOptimistic: v,
      }),
    },
    setOptimisticFail: {
      getPromise: ({ args: [v], promiseId }) => getFailedTimeoutPromise(50, new Error(v), promiseId),
      optimisticEffects: ({ s, args: [v] }) => ({
        ...s,
        propOptimistic: v,
      }),
      errorEffects: ({ s, err }) => ({ ...s, propError: err.message }),
    },
  };

  const options: StoreOptions<State, Actions, Props, any> = {
    onPropsChange: {
      getDeps: (p) => [p.propIn],
      effects: ({ s, p }) => ({ ...s, propProps: p.propIn }),
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

  it('logEffects', async () => {
    let logger = jest.fn();
    const store = createStore(getInitialState, actions, options, [logEffects(logger)]);

    store.init({ propIn: '' });

    store.actions.setSimpleSync('v1');
    store.actions.setSync('v2');
    await store.actions.setAsync('v3');
    await store.actions.setAsyncParallel('v3', 'k1', true, 10);

    expect(logger).toHaveBeenCalledTimes(6);
  });
  it('logDetailedEffects', async () => {
    let logger: Logger = {
      log: jest.fn(),
      group: jest.fn(),
      groupEnd: jest.fn(),
      groupCollapsed: jest.fn(),
    };
    const store = createStore(getInitialState, actions, options, [logDetailedEffects(logger)]);

    store.init({ propIn: '' });

    store.actions.setSimpleSync('v1');
    store.actions.setSync('v2');
    await store.actions.setAsync('v3');
    await store.actions.setAsyncParallel('v3', 'k1', true, 10);

    expect(logger.log).toHaveBeenCalled();
    expect(logger.group).toHaveBeenCalled();
    expect(logger.groupEnd).toHaveBeenCalled();
    expect(logger.groupCollapsed).toHaveBeenCalled();
  });
});
