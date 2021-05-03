/*
 * Copyright 2019 Globalsport SAS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { createStore } from '../src/index';
import { StoreAction, StoreActions } from '../src/types';

describe('Async action', () => {
  type State = {
    prop1: string;
    prop2: string;
    error: string;
  };

  type Actions = {
    successAction: (p: string) => Promise<string>;
    errorAction: (p: string) => Promise<any>;
    errorRejectAction: (p: string) => Promise<any>;
    cancelAction: (p: string) => Promise<any>;
    cancelActionNoPre: (p: string) => Promise<any>;
    retryAction: (p: string) => Promise<any>;
  };

  type Props = {
    callback: (s: string, state: State) => any;
    callbackError: (s: string, state: State) => any;
    callbackCancel: () => any;
  };

  const baseAction: StoreAction<State, Actions['successAction'], Actions, Props> = {
    preEffects: ({ s }) => ({ ...s, prop1: 'pre' }),
    getPromise: () => Promise.resolve('resolved'),
    effects: ({ s, res: prop1, args: [prop2] }) => ({ ...s, prop1, prop2 }),
    errorEffects: ({ s, err }) => ({ ...s, error: err.message }),
    sideEffects: ({ s, p }) => {
      p.callback('onDone', s);
    },
    errorSideEffects: ({ p, s }) => {
      p.callbackError('onFail', s);
    },
    getSuccessMessage: () => 'yosh',
    getErrorMessage: () => 'too bad!',
  };

  const actionsImpl: StoreActions<State, Actions, Props> = {
    successAction: { ...baseAction },
    errorAction: {
      ...baseAction,
      getPromise: () => Promise.reject(new Error('failed!')),
    },
    errorRejectAction: {
      ...baseAction,
      getPromise: () => Promise.reject(new Error('failed!')),
      rejectPromiseOnError: true,
    },
    cancelAction: {
      ...baseAction,
      getPromise: () => null,
    },
    cancelActionNoPre: {
      ...baseAction,
      getPromise: () => null,
      preEffects: () => null,
    },
    retryAction: {
      ...baseAction,
    },
  };

  const getInitialState = (): State => ({
    prop1: '',
    prop2: '',
    error: '',
  });

  it('successful action', () => {
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackError = jest.fn();
    const callbackCancel = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    const getPromise = jest.fn(() => Promise.resolve('resolved'));

    const actions: StoreActions<State, Actions, Props> = {
      ...actionsImpl,
      successAction: {
        ...baseAction,
        getPromise,
      },
    };

    const store = createStore(getInitialState, actions, {
      notifySuccess,
      notifyError,
    });

    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    const { isLoading } = store;

    const promise = store.actions.successAction('result').then(() => {
      expect(store.state).toEqual({
        prop1: 'resolved',
        prop2: 'result',
        error: '',
      });

      expect(isLoading('successAction')).toBeFalsy();

      // effect + loadingMap
      expect(listener).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith('onDone', {
        prop1: 'resolved',
        prop2: 'result',
        error: '',
      });
      expect(notifySuccess).toHaveBeenCalledWith('yosh');
      expect(notifyError).not.toHaveBeenCalled();
    });

    const stateToTest = (getPromise.mock.calls[0] as any)[0].s;

    expect(stateToTest).toEqual({
      prop1: 'pre',
      prop2: '',
      error: '',
    });

    const { loading, loadingMap } = store;
    expect(loading).toBe(true);
    expect(loadingMap.successAction).toBe(true);

    expect(listener).toHaveBeenCalledTimes(2);

    expect(store.state).toEqual({
      prop1: 'pre',
      prop2: '',
      error: '',
    });

    expect(isLoading('successAction')).toBeTruthy();
    expect(store.loading).toBeTruthy();
    expect(store.loadingMap.successAction).toBeTruthy();

    return promise;
  });

  it('cancelled action + preEffects', () => {
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackError = jest.fn();
    const callbackCancel = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    const store = createStore(getInitialState, actionsImpl, {
      notifySuccess,
      notifyError,
    });
    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    const { isLoading } = store;

    const promise = store.actions.cancelAction('result');

    expect(promise).toBeUndefined();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();

    expect(store.state).toEqual({
      prop1: 'pre',
      prop2: '',
      error: '',
    });

    expect(callbackCancel).not.toHaveBeenCalled();

    expect(isLoading('successAction')).toBeFalsy();

    return promise;
  });

  it('cancelled action NO PRE', () => {
    const listener = jest.fn();

    const callback = jest.fn();
    const callbackError = jest.fn();
    const callbackCancel = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    const store = createStore(getInitialState, actionsImpl, {
      notifySuccess,
      notifyError,
    });
    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    const { isLoading } = store;

    const promise = store.actions.cancelActionNoPre('result');

    expect(promise).toBeUndefined();

    // no state change
    expect(listener).toHaveBeenCalledTimes(1);
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();

    expect(store.state).toEqual({
      prop1: '',
      prop2: '',
      error: '',
    });

    expect(callbackCancel).not.toHaveBeenCalled();

    expect(isLoading('successAction')).toBeFalsy();

    return promise;
  });

  it('error action', (done) => {
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackError = jest.fn();
    const callbackCancel = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    const store = createStore(getInitialState, actionsImpl, {
      notifySuccess,
      notifyError,
    });
    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    const { isLoading } = store;

    const promise = store.actions
      .errorAction('test')
      .then(() => {
        expect(store.state).toEqual({
          prop1: 'pre',
          prop2: '',
          error: 'failed!',
        });

        expect(isLoading('errorAction')).toBeFalsy();

        // effect + loadingMap
        expect(listener).toHaveBeenCalledTimes(3);
        expect(callbackError).toHaveBeenCalledWith('onFail', {
          prop1: 'pre',
          prop2: '',
          error: 'failed!',
        });
        expect(notifySuccess).not.toHaveBeenCalled();
        expect(notifyError).toHaveBeenCalled();

        done();
      })
      .catch((e) => {
        done.fail(e);
      });

    expect(listener).toHaveBeenCalledTimes(2);

    expect(store.state).toEqual({
      prop1: 'pre',
      prop2: '',
      error: '',
    });

    expect(isLoading('errorAction')).toBeTruthy();

    return promise;
  });

  it('error & reject action', (done) => {
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackError = jest.fn();
    const callbackCancel = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    const store = createStore(getInitialState, actionsImpl, {
      notifySuccess,
      notifyError,
    });
    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    return store.actions
      .errorRejectAction('test')
      .then(done.fail)
      .catch(() => {
        done();
      });
  });

  it('retry action (successful)', () => {
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackError = jest.fn();
    const callbackCancel = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    // getPromise is not pure!!
    // DO NOT DO THIS AT HOME
    // only for testing
    let callCount = 0;

    const retryActionsImpl: StoreActions<State, Actions, Props> = {
      ...actionsImpl,
      retryAction: {
        ...baseAction,
        retryCount: 5,
        retryDelaySeed: 10,
        getPromise: (ctx) => {
          if (callCount < 3) {
            callCount++;
            return Promise.reject(new TypeError('error'));
          }
          return baseAction.getPromise(ctx);
        },
      },
    };

    const store = createStore(getInitialState, retryActionsImpl, {
      notifySuccess,
      notifyError,
    });

    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    const { isLoading } = store;

    const promise = store.actions.retryAction('result').then(() => {
      try {
        expect(store.state).toEqual({
          prop1: 'resolved',
          prop2: 'result',
          error: '',
        });

        expect(isLoading('retryAction')).toBeFalsy();

        // effect + loadingMap
        expect(listener).toHaveBeenCalledTimes(3);
        expect(callback).toHaveBeenCalledWith('onDone', {
          prop1: 'resolved',
          prop2: 'result',
          error: '',
        });
        expect(notifySuccess).toHaveBeenCalledWith('yosh');
        expect(notifyError).not.toHaveBeenCalled();

        expect(callCount).toEqual(3);
      } catch (e) {
        return Promise.reject(e);
      }
    });

    expect(listener).toHaveBeenCalledTimes(2);

    expect(store.state).toEqual({
      prop1: 'pre',
      prop2: '',
      error: '',
    });

    expect(isLoading('retryAction')).toBeTruthy();

    return promise;
  });

  it('retry action (fails)', () => {
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackError = jest.fn();
    const callbackCancel = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    // getPromise is not pure!!
    // DO NOT DO THIS AT HOME
    // only for testing
    let callCount = 0;

    const retryActionsImpl: StoreActions<State, Actions, Props> = {
      ...actionsImpl,
      retryAction: {
        ...baseAction,
        retryCount: 2,
        retryDelaySeed: 10,
        getPromise: (ctx) => {
          if (callCount < 3) {
            callCount++;
            return Promise.reject(new TypeError('failed!'));
          }
          return baseAction.getPromise(ctx);
        },
      },
    };

    const store = createStore(getInitialState, retryActionsImpl, {
      notifySuccess,
      notifyError,
    });

    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    const { isLoading } = store;

    const promise = store.actions.retryAction('result').then(() => {
      try {
        expect(store.state).toEqual({
          prop1: 'pre',
          prop2: '',
          error: 'failed!',
        });

        expect(isLoading('retryAction')).toBeFalsy();

        // effect + loadingMap
        expect(listener).toHaveBeenCalledTimes(3);
        expect(callback).not.toHaveBeenCalled();
        expect(callbackError).toHaveBeenCalledWith('onFail', {
          prop1: 'pre',
          prop2: '',
          error: 'failed!',
        });

        expect(notifySuccess).not.toHaveBeenCalled();
        expect(notifyError).toHaveBeenCalled();

        expect(callCount).toEqual(3);
      } catch (e) {
        return Promise.reject(e);
      }
    });

    expect(listener).toHaveBeenCalledTimes(2);

    expect(store.state).toEqual({
      prop1: 'pre',
      prop2: '',
      error: '',
    });

    expect(isLoading('retryAction')).toBeTruthy();

    return promise;
  });

  it('aborted action during promise execution (fails)', () => {
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackError = jest.fn();
    const callbackCancel = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    const patchedActionsImpl: StoreActions<State, Actions, Props> = {
      ...actionsImpl,
      successAction: {
        ...baseAction,
        abortable: true,
        getPromise: ({ s, args: [param], abortSignal }) =>
          new Promise((resolve, reject) => {
            const timeout = window.setTimeout(resolve, 200, param);
            abortSignal.addEventListener('abort', () => {
              window.clearTimeout(timeout);
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      },
    };

    const store = createStore(getInitialState, patchedActionsImpl, {
      notifySuccess,
      notifyError,
    });

    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    const { isLoading, abortAction } = store;

    const promise = store.actions.successAction('result').then(() => {
      try {
        expect(store.state).toEqual({
          prop1: 'pre',
          prop2: '',
          error: 'Aborted',
        });

        expect(isLoading('successAction')).toBeFalsy();

        // effect + loadingMap
        expect(listener).toHaveBeenCalledTimes(3);
        expect(callback).not.toHaveBeenCalled();
        expect(callbackError).toHaveBeenCalledWith('onFail', {
          prop1: 'pre',
          prop2: '',
          error: 'Aborted',
        });

        expect(notifySuccess).not.toHaveBeenCalled();
        expect(notifyError).toHaveBeenCalled();
      } catch (e) {
        return Promise.reject(e);
      }
    });

    expect(listener).toHaveBeenCalledTimes(2);

    expect(store.state).toEqual({
      prop1: 'pre',
      prop2: '',
      error: '',
    });

    expect(isLoading('successAction')).toBeTruthy();

    abortAction('successAction');

    return promise;
  });

  it('cascading pre effects', () => {
    type State = {
      value: string;
    };

    type Actions = {
      masterAction: () => Promise<string>;
      childAction: () => Promise<string>;
    };

    const actionsImpl: StoreActions<State, Actions> = {
      masterAction: {
        preEffects: ({ s }) => ({ ...s, value: 'preMaster' }),
        getPromise: ({ s, a }) => {
          expect(s.value).toEqual('preMaster');
          return a.childAction();
        },
        effects: ({ s }) => {
          expect(s.value).toEqual('preChild');
          return s;
        },
      },
      childAction: {
        preEffects: ({ s }) => ({ ...s, value: 'preChild' }),
        getPromise: ({ s }) => {
          expect(s.value).toEqual('preChild');
          return Promise.resolve('');
        },
        effects: ({ s }) => {
          expect(s.value).toEqual('preChild');
          return s;
        },
      },
    };

    const store = createStore(() => ({ value: '' }), actionsImpl);
    store.init(null);

    const stateListener = jest.fn();
    store.addStateListener(stateListener);

    const p = store.actions.masterAction().then(() => {
      expect(store.state.value).toEqual('preChild');
    });

    // preEffect of child action
    expect(stateListener.mock.calls[0][0].value).toEqual('preChild');

    // notify of master action but childAction was called setting the state.
    expect(stateListener.mock.calls[1][0].value).toEqual('preChild');

    return p;
  });
});
