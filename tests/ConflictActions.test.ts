/*
 * Copyright 2019 Globalsport SAS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { createStore } from '../src';
import { ConflictPolicy, StoreAction, StoreActions } from '../src/types';

function getTimeoutPromise<C>(timeout: number, result: C = null): Promise<C> {
  return new Promise((res) => {
    setTimeout(res, timeout, result);
  });
}

function getFailedTimeoutPromise<C>(timeout: number, err: Error): Promise<C> {
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
    effects: ({ s, args: [res] }) => ({ values: s.values.concat(res) }),
    errorEffects: ({ s, args: [value] }) => ({ errors: s.errors.concat(value) }),
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

    const store = createStore({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: actionsImpl,
    });

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

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          getPromise: ({ args: [value] }) => {
            if (value === 'v2') {
              return null;
            } else if (value === 'v3') {
              return (getFailedTimeoutPromise(50, new Error('v3')) as any) as Promise<string>;
            }
            return getTimeoutPromise(50, value) as Promise<string>;
          },
          effects: ({ s, args: [res] }) => ({ values: s.values.concat(res) }),
          errorEffects: ({ s, args: [value] }) => ({ errors: s.errors.concat(value) }),
          sideEffects: ({ s, p }) => {
            p.callback('onDone', s);
          },
          errorSideEffects: ({ p, s }) => {
            p.callbackError('onFail', s);
          },
        },
      },
    });

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

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.KEEP_LAST,
        },
      },
    });

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

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.REUSE,
        },
      },
    });

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

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.REUSE,
        },
      },
    });

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

  it('REUSE works as expected [undefined bug]', () => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.REUSE,
        },
      },
    });

    store.setProps({
      callback,
      callbackError,
    });

    const setValue = store.actions.setValue;

    const p1 = setValue(undefined);
    const p2 = setValue('v1');

    expect(p2).not.toBe(p1);

    return Promise.all([p1, p2]).then(() => {
      expect(store.state).toEqual({
        values: [undefined, 'v1'],
        errors: [],
      });
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  it('REUSE works as expected [cancel promise bug]', () => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    // BAD !! for testing only
    let count = 0;

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          ...setValueAction,
          getPromise: ({ args: [value] }) => {
            if (value == null) {
              return null;
            }

            if (count++ < 2) {
              return getFailedTimeoutPromise(5, new TypeError('failed')) as any;
            }

            return getTimeoutPromise(5, value);
          },
          conflictPolicy: ConflictPolicy.REUSE,
          retryCount: 5,
          retryDelaySeed: 1,
        },
      },
    });

    store.setProps({
      callback,
      callbackError,
    });

    const setValue = store.actions.setValue;

    const p1 = setValue(undefined);
    const p2 = setValue('v1');

    expect(p2).not.toBe(p1);

    return Promise.all([p1, p2]).then(() => {
      expect(store.state).toEqual({
        values: ['v1'],
        errors: [],
      });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  it('RETRY works as expected [MAX retry]', (done) => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    let count = 0;

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          ...setValueAction,
          getPromise: ({ args: [value] }) => {
            count++;
            return getFailedTimeoutPromise(5, new TypeError('failed')) as any;
          },
          retryCount: 3,
          retryDelaySeed: 1,
        },
      },
    });

    store.setProps({
      callback,
      callbackError,
    });

    const setValue = store.actions.setValue;

    const p1 = setValue('v1');

    p1.then(() => {
      done.fail();
    }).catch((e) => {
      expect(count).toBe(1 + 3);
      expect(store.state).toEqual({
        values: [],
        errors: ['v1'],
      });
      expect(callback).toHaveBeenCalledTimes(0);
      done();
    });
  });

  it('IGNORE works as expected', () => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.IGNORE,
        },
      },
    });

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

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.REJECT,
        },
      },
    });

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

    Promise.all([p1, p2]).then(() => {
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

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.PARALLEL,
          getPromiseId: (value: string) => value,
        },
      },
    });

    store.setProps({
      callback,
      callbackError,
    });

    const setValue = store.actions.setValue;

    const p1 = setValue('v1');

    expect(store.loadingParallelMap.setValue['v1']).toBeTruthy();

    expect(store.loadingParallelMap.setValue['v2']).toBeFalsy();
    const p2 = setValue('v2');
    expect(store.loadingParallelMap.setValue['v2']).toBeTruthy();

    expect(store.loadingParallelMap.setValue['v3']).toBeFalsy();
    const p3 = setValue('v3');
    expect(store.loadingParallelMap.setValue['v3']).toBeTruthy();

    return Promise.all([p1, p2, p3]).then(() => {
      expect(store.state).toEqual({
        values: ['v1', 'v2', 'v3'],
        errors: [],
      });
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callbackError).not.toHaveBeenCalled();
    });
  });

  it('PARALLEL works as expected (error)', () => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    let reqCount = 0;

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.PARALLEL,
          getPromiseId: (value: string) => value,
          getPromise: ({ args: [v] }) =>
            reqCount++ === 1 ? getFailedTimeoutPromise(50, new Error('failed')) : getTimeoutPromise(50, v),
        },
      },
    });

    store.setProps({
      callback,
      callbackError,
    });

    const setValue = store.actions.setValue;

    const p1 = setValue('v1');

    expect(store.loadingParallelMap.setValue['v1']).toBeTruthy();

    expect(store.loadingParallelMap.setValue['v2']).toBeFalsy();
    const p2 = setValue('v2');
    expect(store.loadingParallelMap.setValue['v2']).toBeTruthy();

    expect(store.loadingParallelMap.setValue['v3']).toBeFalsy();
    const p3 = setValue('v3');
    expect(store.loadingParallelMap.setValue['v3']).toBeTruthy();

    return Promise.all([p1, p2, p3]).then(() => {
      expect(store.state).toEqual({
        values: ['v1', 'v3'],
        errors: ['v2'],
      });
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callbackError).toHaveBeenCalledTimes(1);
      expect(store.errorParallelMap.setValue['v1']).toBeUndefined();
      expect(store.errorParallelMap.setValue['v3']).toBeUndefined();
      expect(store.errorParallelMap.setValue['v2']).toBeInstanceOf(Error);
    });
  });

  it('PARALLEL works as expected (reset error)', () => {
    const callback = jest.fn();
    const callbackError = jest.fn();

    let reqCount = 0;

    const store = createStore<State, Actions, Props>({
      getInitialState: () => ({
        values: [],
        errors: [],
      }),
      actions: {
        setValue: {
          ...setValueAction,
          conflictPolicy: ConflictPolicy.PARALLEL,
          getPromiseId: (value: string) => value,
          getPromise: ({ args: [v] }) =>
            reqCount++ === 1 ? getFailedTimeoutPromise(50, new Error('failed')) : getTimeoutPromise(50, v),
        },
      },
    });

    store.setProps({
      callback,
      callbackError,
    });

    const setValue = store.actions.setValue;

    const p1 = setValue('v1');
    const p2 = setValue('v2').then(() => setValue('v2'));
    const p3 = setValue('v3');

    return Promise.all([p1, p2, p3]).then(() => {
      expect(store.state).toEqual({
        values: ['v1', 'v3', 'v2'],
        errors: ['v2'],
      });
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callbackError).toHaveBeenCalledTimes(1);
      expect(store.errorParallelMap.setValue['v1']).toBeUndefined();
      expect(store.errorParallelMap.setValue['v2']).toBeUndefined();
      expect(store.errorParallelMap.setValue['v3']).toBeUndefined();
    });
  });
});
