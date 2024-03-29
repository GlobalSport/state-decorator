import { StoreActions, StoreOptions, createStore, ConflictPolicy } from '../src';
import { getFailedTimeoutPromise, getTimeoutPromise } from './utils';
import { optimisticActions } from '../src/middlewares';

describe('Optimistic', () => {
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
    setOptimisticSuccessWithEffects: (v: string) => Promise<string>;
    setOptimisticFail: (v: string) => Promise<string>;
  };

  type Props = {
    propIn: string;
    propIn2: string;
  };

  const actions: StoreActions<State, Actions, Props> = {
    setSimpleSync: ({ args: [v] }) => ({ propSimpleSync: v }),
    setSync: { effects: ({ args: [v] }) => ({ propSync: v }) },
    setAsync: {
      getPromise: ({ args: [v] }) => Promise.resolve(v),
      effects: ({ res }) => ({ propAsync: res }),
    },
    setAsyncParallel: {
      conflictPolicy: ConflictPolicy.PARALLEL,
      getPromiseId: (_, k) => k,
      getPromise: ({ args: [v, , willFail, timeout], promiseId }) =>
        willFail ? getFailedTimeoutPromise(timeout, new Error('error'), promiseId) : getTimeoutPromise(timeout, v),
      optimisticEffects: ({ s, args: [v], promiseId }) => ({
        propAsyncParallel: {
          ...s.propAsyncParallel,
          [promiseId]: v,
        },
      }),
      errorEffects: ({ s, promiseId }) => ({
        propAsyncParallel: { ...s.propAsyncParallel, [promiseId]: 'error' },
      }),
    },
    setOptimisticSuccess: {
      getPromise: ({ args: [v] }) => Promise.resolve(v),
      optimisticEffects: ({ args: [v] }) => ({
        propOptimistic: v,
      }),
    },
    setOptimisticSuccessWithEffects: {
      getPromise: ({ args: [v] }) => Promise.resolve(v),
      optimisticEffects: ({ args: [v] }) => ({
        propOptimistic: v,
      }),
      effects: ({ s }) => ({
        propSync: s.propOptimistic + '_fx',
      }),
    },
    setOptimisticFail: {
      getPromise: ({ args: [v], promiseId }) => getFailedTimeoutPromise(50, new Error(v), promiseId),
      optimisticEffects: ({ args: [v] }) => ({
        propOptimistic: v,
      }),
      errorEffects: ({ err }) => ({ propError: err.message }),
    },
  };

  const options: StoreOptions<State, Actions, Props, any> = {
    onPropsChange: {
      getDeps: (p) => [p.propIn],
      effects: ({ p }) => ({ propProps: p.propIn }),
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

  it('works as expected (success, basic)', async () => {
    const store = createStore({ getInitialState, actions, ...options, middlewares: [optimisticActions()] });
    store.init({ propIn: '', propIn2: '' });

    const p = store.actions.setOptimisticSuccess('value');

    expect(store.loading).toBeFalsy();

    expect(store.state).toEqual({
      propProps: '',
      propSync: '',
      propSimpleSync: '',
      propAsync: '',
      propAsyncParallel: {},
      propOptimistic: 'value',
      propError: '',
    });

    await p;

    expect(store.state).toEqual({
      propProps: '',
      propSync: '',
      propSimpleSync: '',
      propAsync: '',
      propAsyncParallel: {},
      propOptimistic: 'value',
      propError: '',
    });
  });

  it('works as expected (success with effects)', async () => {
    const store = createStore({ getInitialState, actions, ...options, middlewares: [optimisticActions()] });
    store.init({ propIn: '', propIn2: '' });

    await store.actions.setOptimisticSuccessWithEffects('value');

    expect(store.loading).toBeFalsy();

    expect(store.state).toEqual({
      propProps: '',
      propSync: 'value_fx',
      propSimpleSync: '',
      propAsync: '',
      propAsyncParallel: {},
      propOptimistic: 'value',
      propError: '',
    });
  });

  it('works as expected (failure, basic)', async () => {
    const store = createStore({ getInitialState, actions, ...options, middlewares: [optimisticActions()] });
    store.init({ propIn: '', propIn2: '' });

    const p = store.actions.setOptimisticFail('value');

    expect(store.loading).toBeFalsy();

    expect(store.state).toEqual({
      propProps: '',
      propSync: '',
      propSimpleSync: '',
      propAsync: '',
      propAsyncParallel: {},
      propOptimistic: 'value',
      propError: '',
    });

    await p;

    expect(store.state).toEqual({
      propProps: '',
      propSync: '',
      propSimpleSync: '',
      propAsync: '',
      propAsyncParallel: {},
      propOptimistic: '',
      propError: 'value',
    });
  });

  it('works as expected (extra effects before failure)', () => {
    const store = createStore({ getInitialState, actions, ...options, middlewares: [optimisticActions()] });
    store.init({ propIn: '', propIn2: '' });

    const p = store.actions.setOptimisticFail('value');

    expect(store.loading).toBeFalsy();

    expect(store.state).toEqual({
      propProps: '',
      propSync: '',
      propSimpleSync: '',
      propAsync: '',
      propAsyncParallel: {},
      propOptimistic: 'value',
      propError: '',
    });

    store.actions.setSimpleSync('v1');
    store.actions.setSync('v2');
    store.actions.setAsync('v3');

    return p.then(() => {
      expect(store.state).toEqual({
        propProps: '',
        propSimpleSync: 'v1',
        propSync: 'v2',
        propAsync: 'v3',
        propAsyncParallel: {},
        propOptimistic: '', // cancelled
        propError: 'value',
      });
    });
  });

  it('works as expected (fail, onPropsChange)', () => {
    const store = createStore({ getInitialState, actions, ...options, middlewares: [optimisticActions()] });
    store.init({ propIn: '', propIn2: '' });

    const p = store.actions.setOptimisticFail('value');

    expect(store.loading).toBeFalsy();

    expect(store.state).toEqual({
      propProps: '',
      propSync: '',
      propSimpleSync: '',
      propAsync: '',
      propAsyncParallel: {},
      propOptimistic: 'value',
      propError: '',
    });

    store.setProps({
      propIn: 'propChanged',
      propIn2: '',
    });

    return p.then(() => {
      expect(store.state).toEqual({
        propProps: 'propChanged',
        propSimpleSync: '',
        propSync: '',
        propAsync: '',
        propAsyncParallel: {},
        propOptimistic: '', // cancelled
        propError: 'value',
      });
    });
  });

  it('works as expected (fail, 2 onPropsChanges)', () => {
    const options: StoreOptions<State, Actions, Props, any> = {
      onPropsChange: [
        {
          getDeps: (p) => [p.propIn],
          effects: ({ s, p }) => ({ propProps: p.propIn }),
        },
        {
          getDeps: (p) => [p.propIn2],
          effects: ({ s, p }) => ({ propProps: s.propProps + '_' + p.propIn2 }),
        },
      ],
    };

    const store = createStore({ getInitialState, actions, ...options, middlewares: [optimisticActions()] });

    store.init({ propIn: '', propIn2: '' });

    const p = store.actions.setOptimisticFail('value');

    expect(store.loading).toBeFalsy();

    expect(store.state).toEqual({
      propProps: '',
      propSync: '',
      propSimpleSync: '',
      propAsync: '',
      propAsyncParallel: {},
      propOptimistic: 'value',
      propError: '',
    });

    store.setProps({
      propIn: 'propChanged',
      propIn2: 'propChanged2',
    });

    return p.then(() => {
      expect(store.state).toEqual({
        propProps: 'propChanged_propChanged2',
        propSimpleSync: '',
        propSync: '',
        propAsync: '',
        propAsyncParallel: {},
        propOptimistic: '', // cancelled
        propError: 'value',
      });
    });
  });

  it('works as expected (fail, parallel promises)', () => {
    const store = createStore({ getInitialState, actions, ...options, middlewares: [optimisticActions()] });
    store.init({ propIn: '', propIn2: '' });

    const p = store.actions.setAsyncParallel('value1', 'k1', true, 200);

    expect(store.state).toEqual({
      propProps: '',
      propSync: '',
      propSimpleSync: '',
      propAsync: '',
      propAsyncParallel: {
        k1: 'value1',
      },
      propOptimistic: '',
      propError: '',
    });

    const p2 = store.actions.setAsyncParallel('value2', 'k2', false, 70);
    expect(store.state).toEqual({
      propProps: '',
      propSync: '',
      propSimpleSync: '',
      propAsync: '',
      propAsyncParallel: {
        k1: 'value1',
        k2: 'value2',
      },
      propOptimistic: '',
      propError: '',
    });

    store.actions.setSimpleSync('simplesync');

    const p3 = store.actions.setAsyncParallel('value3', 'k3', true, 10);
    expect(store.state).toEqual({
      propProps: '',
      propSync: '',
      propSimpleSync: 'simplesync',
      propAsync: '',
      propAsyncParallel: {
        k1: 'value1',
        k2: 'value2',
        k3: 'value3',
      },
      propOptimistic: '',
      propError: '',
    });

    store.actions.setSync('sync');

    return Promise.all([p, p2, p3]).then(() => {
      expect(store.state).toEqual({
        propProps: '',
        propSync: 'sync',
        propSimpleSync: 'simplesync',
        propAsync: '',
        propAsyncParallel: {
          k1: 'error',
          k2: 'value2',
          k3: 'error',
        },
        propOptimistic: '',
        propError: '',
      });

      store.destroy();
    });
  });
});
