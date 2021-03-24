import { createStore } from '../src';
import { ConflictPolicy, StoreAction, StoreActions } from '../src/types';

function getTimeoutPromise<C>(timeout: number, result: C = null): Promise<C> {
  return new Promise((res) => {
    setTimeout(res, timeout, result);
  });
}

function getFailedTimeoutPromise<C>(timeout: number, err: C = null): Promise<C> {
  return new Promise((_, rej) => {
    setTimeout(rej, timeout, err);
  });
}

describe('Conflicting actions', () => {
  type State = { values: string[]; errors: string[] };

  type Actions = {
    setValue: (value: string, timeout?: number) => Promise<string>;
  };

  type Props = {
    callback: (s: string, state: State) => any;
    callbackError: (s: string, state: State) => any;
  };

  const setValueAction: StoreAction<State, Actions['setValue'], Actions, Props> = {
    getPromise: ({ args: [value] }) => getTimeoutPromise(50, value),
    effects: ({ s, args: [res] }) => ({ ...s, values: s.values.concat(res) }),
    errorEffects: ({ s, args: [value] }) => ({ ...s, errors: s.errors.concat(value) }),
    sideEffects: ({ s, p }) => {
      p.callback('onDone', s);
    },
    errorSideEffects: ({ p, s }) => {
      p.callbackError('onFail', s);
    },
  };

  const actionsImpl: StoreActions<State, Actions, Props> = {
    setValue: setValueAction,
  };

  it('KEEP_ALL works as expected', (done) => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    const store = createStore(
      () => ({
        values: [],
        errors: [],
      }),
      actionsImpl
    );

    store.setProps({
      callback,
      callbackError,
    });

    const setValue = store.actions.setValue;

    setValue('v1');
    setValue('v2');
    setValue('v3');
    setValue('v4').then(() => {
      expect(store.state).toEqual({
        values: ['v1', 'v2', 'v3', 'v4'],
        errors: [],
      });
      expect(callback).toHaveBeenCalledTimes(4);
      expect(callbackError).not.toHaveBeenCalled();
      done();
    });
  });

  it('KEEP_ALL works as expected (null, fail)', (done) => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    const actionsImpl: StoreActions<State, Actions, Props> = {
      setValue: {
        getPromise: ({ args: [value] }) => {
          if (value === 'v2') {
            return null;
          } else if (value === 'v3') {
            return (getFailedTimeoutPromise(50, new Error('v3')) as any) as Promise<string>;
          }
          return getTimeoutPromise(50, value) as Promise<string>;
        },
        effects: ({ s, args: [res] }) => ({ ...s, values: s.values.concat(res) }),
        errorEffects: ({ s, args: [value] }) => ({ ...s, errors: s.errors.concat(value) }),
        sideEffects: ({ s, p }) => {
          p.callback('onDone', s);
        },
        errorSideEffects: ({ p, s }) => {
          p.callbackError('onFail', s);
        },
      },
    };

    const store = createStore(
      () => ({
        values: [],
        errors: [],
      }),
      actionsImpl
    );

    store.setProps({
      callback,
      callbackError,
    });

    const setValue = store.actions.setValue;

    setValue('v1');
    setValue('v2');
    setValue('v3');
    setValue('v4').then(() => {
      expect(store.state).toEqual({
        values: ['v1', 'v4'],
        errors: ['v3'],
      });
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callbackError).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('KEEP_LAST works as expected', (done) => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    const store = createStore<State, Actions, Props>(
      () => ({
        values: [],
        errors: [],
      }),
      {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.KEEP_LAST,
        },
      }
    );

    store.setProps({
      callback,
      callbackError,
    });

    const { isLoading } = store;

    const setValue = store.actions.setValue;

    setValue('v1');
    setValue('v2');
    setValue('v3');
    setValue('v4').then(() => {
      expect(store.state).toEqual({
        values: ['v1', 'v4'],
        errors: [],
      });
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callbackError).not.toHaveBeenCalled();
      done();
    });
  });

  it('REUSE works as expected [same args]', () => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    const store = createStore<State, Actions, Props>(
      () => ({
        values: [],
        errors: [],
      }),
      {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.REUSE,
        },
      }
    );

    store.setProps({
      callback,
      callbackError,
    });

    const setValue = store.actions.setValue;

    const p1 = setValue('v1');
    const p2 = setValue('v1');
    const p3 = setValue('v1');

    expect(p2).toBe(p1);
    expect(p3).toBe(p1);

    return p1.then(() => {
      expect(store.state).toEqual({
        values: ['v1'],
        errors: [],
      });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  it('REUSE works as expected [other args]', () => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    const store = createStore<State, Actions, Props>(
      () => ({
        values: [],
        errors: [],
      }),
      {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.REUSE,
        },
      }
    );

    store.setProps({
      callback,
      callbackError,
    });

    const setValue = store.actions.setValue;

    const p1 = setValue('v1');
    const p2 = setValue('v1');
    const p3 = setValue('v3');

    expect(p2).toBe(p1);
    expect(p3).not.toBe(p1);

    return Promise.all([p1, p3]).then(() => {
      expect(store.state).toEqual({
        values: ['v1', 'v3'],
        errors: [],
      });
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  it('IGNORE works as expected', () => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    const store = createStore<State, Actions, Props>(
      () => ({
        values: [],
        errors: [],
      }),
      {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.IGNORE,
        },
      }
    );

    store.setProps({
      callback,
      callbackError,
    });

    const { isLoading } = store;

    const setValue = store.actions.setValue;

    const p1 = setValue('v1');
    const p2 = setValue('v2');
    const p3 = setValue('v3');
    const p4 = setValue('v4');

    return Promise.all([p1, p2, p3, p4]).then(() => {
      expect(store.state).toEqual({
        values: ['v1'],
        errors: [],
      });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callbackError).not.toHaveBeenCalled();
    });
  });

  it('REJECT works as expected', (done) => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    const store = createStore<State, Actions, Props>(
      () => ({
        values: [],
        errors: [],
      }),
      {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.REJECT,
        },
      }
    );

    store.setProps({
      callback,
      callbackError,
    });

    const { isLoading } = store;

    const setValue = store.actions.setValue;

    const p1 = setValue('v1');
    const p2 = setValue('v2')
      .then(() => {
        done.fail('Should have been rejected');
      })
      .catch((e) => {
        expect(e).toBeDefined();
      });

    return Promise.all([p1, p2]).then(() => {
      expect(store.state).toEqual({
        values: ['v1'],
        errors: [],
      });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callbackError).not.toHaveBeenCalled();
      done();
    });
  });

  it('PARALLEL works as expected', () => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    const store = createStore<State, Actions, Props>(
      () => ({
        values: [],
        errors: [],
      }),
      {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.PARALLEL,
          getPromiseId: (value: string) => value,
        },
      }
    );

    store.setProps({
      callback,
      callbackError,
    });

    const setValue = store.actions.setValue;

    const p1 = setValue('v1');

    expect(store.loadingParallelMap['setValue']['v1']).toBeTruthy();

    expect(store.loadingParallelMap['setValue']['v2']).toBeFalsy();
    const p2 = setValue('v2');
    expect(store.loadingParallelMap['setValue']['v2']).toBeTruthy();

    expect(store.loadingParallelMap['setValue']['v3']).toBeFalsy();
    const p3 = setValue('v3');
    expect(store.loadingParallelMap['setValue']['v3']).toBeTruthy();

    return Promise.all([p1, p2, p3]).then(() => {
      expect(store.state).toEqual({
        values: ['v1', 'v2', 'v3'],
        errors: [],
      });
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callbackError).not.toHaveBeenCalled();
    });
  });
});
