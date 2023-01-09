/*
 * Copyright 2019 Globalsport SAS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @jest-environment jsdom
 */

import { EffectError, globalConfig } from '../src/impl';
import { createStore, setGlobalConfig } from '../src/index';
import { StoreAction, StoreActions } from '../src/types';
import { getFailedTimeoutPromise, getTimeoutPromise } from './utils';

describe('Async action', () => {
  beforeAll(() => {
    setGlobalConfig({
      getErrorMessage: () => 'global error',
    });
  });

  type State = {
    prop1: string;
    prop2: string;
    error: string;
  };

  type Actions = {
    successAction: (p: string) => Promise<string>;
    errorAction: (p: string) => Promise<any>;
    errorActionGetErrorMsg: (p: string) => Promise<any>;
    errorActionDefaultErrorMsg: (p: string) => Promise<any>;
    errorRejectAction: (p: string) => Promise<any>;
    errorNotManaged: (p: string) => Promise<any>;
    errorisErrorManaged: (p: string) => Promise<any>;
    errorisErrorManagedNoErrorMsg: (p: string) => Promise<any>;
    errorisErrorManagedButReject: (p: string) => Promise<any>;
    cancelAction: (p: string) => Promise<any>;
    cancelActionNoPre: (p: string) => Promise<any>;
    retryAction: (p: string) => Promise<any>;
    resetError: (action: keyof Actions) => void;
    effectError: () => Promise<string>;
    errorEffectError: () => Promise<string>;
    preEffectError: () => Promise<string>;
  };

  type Props = {
    callback: (s: string, state: State) => any;
    callbackError: (s: string, state: State) => any;
    callbackCancel: () => any;
  };

  const baseAction: StoreAction<State, Actions['successAction'], Actions, Props> = {
    preEffects: ({ s }) => ({ prop1: 'pre' }),
    getPromise: () => Promise.resolve('resolved'),
    effects: ({ s, res: prop1, args: [prop2] }) => ({ prop1, prop2 }),
    errorEffects: ({ s, err }) => ({ error: err.message }),
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
    errorActionGetErrorMsg: {
      ...baseAction,
      getPromise: () => Promise.reject(new Error('failed!')),
      // override default getErrorMessage
      getErrorMessage: () => null,
      errorEffects: null,
      errorSideEffects: null,
    },
    resetError: {
      sideEffects: ({ args: [name], clearError }) => {
        clearError(name);
      },
    },
    errorActionDefaultErrorMsg: {
      ...baseAction,
      getPromise: () => Promise.reject(new Error('failed!')),
      // NOT override default getErrorMessage
      getErrorMessage: null,
      errorEffects: null,
      errorSideEffects: null,
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
    errorNotManaged: {
      getPromise: () => Promise.reject(new Error('failed!')),
      getErrorMessage: () => null,
      errorEffects: null,
      errorSideEffects: null,
    },
    errorisErrorManaged: {
      isErrorManaged: true,
      getPromise: () => Promise.reject(new Error('failed!')),
      getErrorMessage: () => null,
      errorEffects: null,
      errorSideEffects: null,
    },
    errorisErrorManagedNoErrorMsg: {
      isErrorManaged: true,
      getPromise: () => Promise.reject(new Error('failed!')),
      getErrorMessage: null,
      errorEffects: null,
      errorSideEffects: null,
    },
    errorisErrorManagedButReject: {
      isErrorManaged: true,
      getPromise: () => Promise.reject(new Error('failed!')),
      getErrorMessage: () => null,
      errorEffects: null,
      errorSideEffects: null,
      rejectPromiseOnError: true,
    },
    retryAction: {
      ...baseAction,
    },
    effectError: {
      getPromise: () => getTimeoutPromise(100, 'value'),
      effects: () => {
        throw new Error('boom in effect');
      },
    },
    errorEffectError: {
      getPromise: () => getFailedTimeoutPromise(100, new Error('failed promised'), 'id'),
      errorEffects: () => {
        throw new Error('boom in error effect');
      },
    },
    preEffectError: {
      preEffects: () => {
        throw new Error('boom in pre effects');
      },
      getPromise: () => getTimeoutPromise(100, 'value'),
    },
  };

  const getInitialState = (): State => ({
    prop1: '',
    prop2: '',
    error: '',
  });

  it('initialActionsMarkedLoading works as expected', () => {
    const actions: StoreActions<State, Actions, Props> = {
      ...actionsImpl,
    };

    const props = {
      callback: null,
      callbackCancel: null,
      callbackError: null,
    };

    const store = createStore({
      getInitialState,
      actions,
      initialActionsMarkedLoading: ['successAction'],
    });
    store.init(props);

    expect(store.loadingMap.successAction).toBeTruthy();

    const store2 = createStore({ getInitialState, actions });
    store2.init(props);

    expect(store2.loadingMap.successAction).toBeFalsy();
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

    const store = createStore({
      getInitialState,
      actions,
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

      expect(store.errorMap.successAction).toBeUndefined();

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

    const store = createStore({
      getInitialState,
      actions: actionsImpl,
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

    const store = createStore({
      getInitialState,
      actions: actionsImpl,
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

    const store = createStore({ getInitialState, actions: actionsImpl, notifySuccess, notifyError });
    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    const asyncErrorHandler = jest.fn();

    setGlobalConfig({
      asyncErrorHandler,
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
        expect(store.errorMap.errorAction).toBeInstanceOf(Error);

        // effect + loadingMap
        expect(listener).toHaveBeenCalledTimes(3);
        expect(callbackError).toHaveBeenCalledWith('onFail', {
          prop1: 'pre',
          prop2: '',
          error: 'failed!',
        });
        expect(notifySuccess).not.toHaveBeenCalled();
        expect(notifyError).toHaveBeenCalled();

        expect(asyncErrorHandler).toHaveBeenCalled();
        // managed flag
        expect(asyncErrorHandler.mock.calls[0][1]).toBeTruthy();

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
  });

  it('error & reject action', (done) => {
    const store = createStore<State, Actions, Props>({ getInitialState, actions: actionsImpl });
    store.init({
      callback: null,
      callbackCancel: null,
      callbackError: null,
    });

    const asyncErrorHandler = jest.fn();

    setGlobalConfig({
      asyncErrorHandler,
    });

    store.actions
      .errorRejectAction('test')
      .then(done.fail)
      .catch(() => {
        expect(asyncErrorHandler).toHaveBeenCalled();
        // managed flag
        expect(asyncErrorHandler.mock.calls[0][1]).toBeTruthy();

        done();
      });
  });

  it('error not managed', (done) => {
    const store = createStore({ getInitialState, actions: actionsImpl });
    store.init({
      callback: null,
      callbackCancel: null,
      callbackError: null,
    });

    const asyncErrorHandler = jest.fn();

    setGlobalConfig({
      asyncErrorHandler,
    });

    store.actions
      .errorNotManaged('test')
      .then(done.fail)
      .catch(() => {
        expect(asyncErrorHandler).toHaveBeenCalled();
        // managed flag
        expect(asyncErrorHandler.mock.calls[0][1]).toBeFalsy();
        done();
      });
  });

  it('error not managed (skip error management)', async () => {
    const store = createStore({ getInitialState, actions: actionsImpl });
    store.init({
      callback: null,
      callbackCancel: null,
      callbackError: null,
    });
    const asyncErrorHandler = jest.fn();

    setGlobalConfig({
      asyncErrorHandler,
    });

    const getErrorMessage = () => 'global error';

    setGlobalConfig({
      getErrorMessage,
    });

    // using store
    await store.actions
      .errorisErrorManaged('test')
      .then(() => {
        expect(asyncErrorHandler).toHaveBeenCalled();
        expect(asyncErrorHandler.mock.calls[0][1]).toBeTruthy();
      })
      .catch(() => {
        throw new Error();
      });

    expect(store.errorMap.errorisErrorManaged).not.toBeUndefined();

    store.clearError('errorisErrorManaged');

    expect(store.errorMap.errorisErrorManaged).toBeUndefined();

    // using side effect
    await store.actions
      .errorisErrorManaged('test')
      .then(() => {
        expect(asyncErrorHandler).toHaveBeenCalled();
        expect(asyncErrorHandler.mock.calls[0][1]).toBeTruthy();
      })
      .catch(() => {
        throw new Error();
      });

    expect(store.errorMap.errorisErrorManaged).not.toBeUndefined();

    store.actions.resetError('errorisErrorManaged');

    expect(store.errorMap.errorisErrorManaged).toBeUndefined();
  });

  it('error not managed (skip error management, in options)', (done) => {
    const store = createStore({ getInitialState, actions: actionsImpl, isErrorManaged: true });
    store.init({
      callback: null,
      callbackCancel: null,
      callbackError: null,
    });
    const asyncErrorHandler = jest.fn();

    setGlobalConfig({
      asyncErrorHandler,
    });

    const getErrorMessage = () => 'global error';

    setGlobalConfig({
      getErrorMessage,
    });

    store.actions
      .errorNotManaged('test')
      .then(() => {
        expect(asyncErrorHandler).toHaveBeenCalled();
        expect(asyncErrorHandler.mock.calls[0][1]).toBeTruthy();
        done();
      })
      .catch(done.fail);
  });

  it('error not managed (skip error management, NOT in options)', (done) => {
    const store = createStore({ getInitialState, actions: actionsImpl });
    store.init({
      callback: null,
      callbackCancel: null,
      callbackError: null,
    });
    const asyncErrorHandler = jest.fn();

    setGlobalConfig({
      asyncErrorHandler,
    });

    store.actions
      .errorNotManaged('test')
      .then(done.fail)
      .catch(() => {
        expect(asyncErrorHandler).toHaveBeenCalled();
        // managed flag
        expect(asyncErrorHandler.mock.calls[0][1]).toBeFalsy();
        done();
      });
  });

  it('error not managed (skip error management + reject)', (done) => {
    const store = createStore({ getInitialState, actions: actionsImpl });
    store.init({
      callback: null,
      callbackCancel: null,
      callbackError: null,
    });
    const asyncErrorHandler = jest.fn();

    const getErrorMessage = () => 'global error';

    setGlobalConfig({
      getErrorMessage,
    });

    setGlobalConfig({
      asyncErrorHandler,
    });

    store.actions
      .errorisErrorManagedButReject('test')
      .then(done.fail)
      .catch(() => {
        expect(asyncErrorHandler).toHaveBeenCalled();
        expect(asyncErrorHandler.mock.calls[0][1]).toBeTruthy();
        done();
      })
      .catch(done.fail);
  });

  it('error & override default getErrorMessage', (done) => {
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackError = jest.fn();
    const callbackCancel = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    const store = createStore({ getInitialState, actions: actionsImpl, notifySuccess, notifyError });
    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    const getErrorMessage = () => 'global error';

    setGlobalConfig({
      getErrorMessage,
    });

    store.actions
      .errorisErrorManagedNoErrorMsg('test')
      .then(() => {
        expect(notifySuccess).not.toHaveBeenCalled();
        expect(notifyError).not.toHaveBeenCalled();
        done();
      })
      .catch(done.fail);
  });

  it('error & override default getErrorMessage', (done) => {
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackError = jest.fn();
    const callbackCancel = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    const store = createStore({ getInitialState, actions: actionsImpl, notifySuccess, notifyError });

    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    store.actions
      .errorActionGetErrorMsg('test')
      .then(done.fail)
      .catch(() => {
        expect(notifySuccess).not.toHaveBeenCalled();
        expect(notifyError).not.toHaveBeenCalled();
        done();
      });
  });

  it('error & not override getErrorMessage', (done) => {
    const listener = jest.fn();
    const callback = jest.fn();
    const callbackError = jest.fn();
    const callbackCancel = jest.fn();
    const notifySuccess = jest.fn();
    const notifyError = jest.fn();

    const store = createStore({ getInitialState, actions: actionsImpl, notifySuccess, notifyError });
    store.addStateListener(listener);
    store.setProps({
      callback,
      callbackError,
      callbackCancel,
    });

    const getErrorMessage = () => 'global error';

    setGlobalConfig({
      getErrorMessage,
    });

    store.actions
      .errorActionDefaultErrorMsg('test')
      // .then(done.fail)
      .then(() => {
        expect(notifySuccess).not.toHaveBeenCalled();
        expect(notifyError).toHaveBeenCalledWith('global error');
        done();
      })
      .catch(() => {
        done.fail();
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

    const store = createStore({ getInitialState, actions: retryActionsImpl, notifySuccess, notifyError });

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

    const store = createStore({ getInitialState, actions: retryActionsImpl, notifySuccess, notifyError });

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

    const store = createStore({ getInitialState, actions: patchedActionsImpl, notifySuccess, notifyError });

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
        preEffects: () => ({ value: 'preMaster' }),
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
        preEffects: () => ({ value: 'preChild' }),
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

    const store = createStore({ getInitialState: () => ({ value: '' }), actions: actionsImpl });
    store.init(null);

    const stateListener = jest.fn();
    store.addStateListener(stateListener);

    const p = store.actions.masterAction().then(() => {
      expect(store.state.value).toEqual('preChild');
    });

    return p;
  });

  it('error in effects', async () => {
    const save = { ...globalConfig };

    const asyncErrorHandler = jest.fn((err: any, isHandled, state, props, actionName, args) => {
      try {
        expect(err).toBeInstanceOf(EffectError);
        const effectErr = err as EffectError;
        expect(effectErr.message).toBe('boom in effect');
        expect(actionName).toBe('effectError');
        expect(isHandled).toBeFalsy();
      } catch (e) {
        throw new Error('test failed');
      }
    });

    setGlobalConfig({
      asyncErrorHandler,
    });

    const store = createStore({ getInitialState, actions: actionsImpl });
    store.init(null);

    try {
      await store.actions.effectError().then(() => {
        throw new Error('test failed');
      });
    } catch (e) {
      expect(asyncErrorHandler).toHaveBeenCalled();
      setGlobalConfig(save);
      if (e.message === 'test failed') {
        return Promise.reject(e);
      }
    }
  });

  it('error in errorEffects', async () => {
    const save = { ...globalConfig };

    const asyncErrorHandler = jest.fn((err: any, isHandled, state, props, actionName, args) => {
      try {
        expect(err).toBeInstanceOf(EffectError);
        const effectErr = err as EffectError;
        expect(effectErr.message).toBe('boom in error effect');
        expect(effectErr.initialError.message).toBe('failed promised');
        expect(actionName).toBe('errorEffectError');
        expect(isHandled).toBeFalsy;
      } catch (e) {
        throw new Error('test failed');
      }
    });

    setGlobalConfig({
      asyncErrorHandler,
    });

    const store = createStore({ getInitialState, actions: actionsImpl });
    store.init(null);

    try {
      await store.actions.errorEffectError();
    } catch (e) {
      expect(asyncErrorHandler).toHaveBeenCalled();
      setGlobalConfig(save);
      if (e.message === 'test failed') {
        return Promise.reject(e);
      }
    }
  });

  it('error in preEffects', async () => {
    const save = { ...globalConfig };

    const asyncErrorHandler = jest.fn((err: any, isHandled, state, props, actionName, args) => {
      try {
        expect(err).toBeInstanceOf(EffectError);
        const effectErr = err as EffectError;
        expect(effectErr.message).toBe('boom in pre effects');
        expect(actionName).toBe('preEffectError');
        expect(isHandled).toBeFalsy;
      } catch (e) {
        throw new Error('test failed');
      }
    });

    setGlobalConfig({
      asyncErrorHandler,
    });

    const store = createStore({ getInitialState, actions: actionsImpl });
    store.init(null);

    try {
      await store.actions.preEffectError();
    } catch (e) {
      expect(asyncErrorHandler).toHaveBeenCalled();
      setGlobalConfig(save);
      if (e.message === 'test failed') {
        return Promise.reject(e);
      }
    }
  });
});
