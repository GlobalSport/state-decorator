import React from 'react';
import { shallow } from 'enzyme';
import StateDecorator, {
  isAsyncAction,
  isSyncAction,
  StateDecoratorActions,
  ConflictPolicy,
  retryDecorator,
  StateDecoratorProps,
  PromiseProvider,
  testSyncAction,
  testAsyncAction,
} from '../src/StateDecorator';

// Jest is not handling properly the failure in asynchronous functions
// (excepted the if the test returns a reject promise).
// Decorate you function with this to manage asynchronous functions.
const jestFail = (done, func) => (...args) => {
  try {
    return func(...args);
  } catch (e) {
    done.fail(e);
  }
};

type ItemMap = { [k: string]: { id: string; value: string } };

describe('StateDecorator', () => {
  it('handles synchronous action on mount', (done) => {
    let wrapper;

    type State = {
      name: string;
      value: number;
      id: string;
    };
    type Actions = {
      action: (name: string, value: number) => void;
    };
    type Props = {
      id: string;
    };

    const actions: StateDecoratorActions<State, Actions, Props> = {
      action: (state, [name, value], props) => ({ name, value, id: props.id }),
    };

    const onMount = (actions) => {
      expect(actions.action).toBeInstanceOf(Function);

      actions.action('name', 'value');
    };

    const render = jestFail(done, (state, actions, loading) => {
      if (state != null) {
        expect(state.name).toEqual('name');
        expect(state.value).toEqual('value');
        expect(state.id).toEqual('10');
        done();
      }
      return <div />;
    });

    const props = {
      actions,
      onMount,
      props: {
        id: '10',
      },
    };

    wrapper = shallow(<StateDecorator {...props}>{render}</StateDecorator>);
  });

  it('handles 2 synchronous actions', (done) => {
    let wrapper;

    type A = {
      action1: () => void;
      action2: () => void;
    };

    interface S {
      str1: string;
      str2: string;
    }

    const actions: StateDecoratorActions<S, A, any> = {
      action1: (s) => ({ ...s, str1: 'changed' }),
      action2: (s) => {
        expect(s.str1).toBe('changed');
        return { ...s, str2: 'changed' };
      },
    };

    const initialState: S = {
      str1: 'init',
      str2: 'init',
    };

    const onMount = (actions) => {
      actions.action1();
      actions.action2();
      done();
    };

    const props = {
      actions,
      onMount,
      initialState,
    };

    wrapper = shallow(<StateDecorator<S, A, any> {...props}>{() => <div />}</StateDecorator>);
  });

  it('load on mount', (done) => {
    const actions = {
      get: {
        promise: (arg, state, props) =>
          Promise.resolve({
            user: state,
            id: props.id,
          }),
      },
    };

    const onMount = jestFail(done, (actions) => {
      expect(actions.get).toBeInstanceOf(Function);

      actions.get().then((data) => {
        expect(data).toEqual({
          user: 'user',
          id: '10',
        });
        done();
      });
    });

    const props = {
      actions,
      onMount,
      props: {
        id: '10',
      },
      initialState: 'user',
    };

    const wrapper = shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);
  });

  it('handles complex service', (done) => {
    const actions = {
      get: {
        promise: () => Promise.resolve('text'),
        reducer: (oldState, data, args) => {
          expect(args[0]).toEqual('arg');
          return data;
        },
      },
      post: () => Promise.resolve('post'),
    };

    const onMount = jestFail(done, (actions) => {
      expect(actions.get).toBeInstanceOf(Function);
      expect(actions.post).toBeInstanceOf(Function);

      actions.get('arg').then((data) => {
        expect(data).toEqual('text');
        done();
      });
    });

    const props = {
      actions,
      onMount,
    };

    const wrapper = shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);
  });

  it('calls correctly reducer', (done) => {
    const actions = {
      get: {
        promise: () => Promise.resolve('text'),
        reducer: (oldState, data, args, props) => props.id,
      },
    };

    const onMount = (actions) => {
      actions.get();
    };

    const props = {
      actions,
      onMount,
      initialState: undefined,
      props: {
        id: '10',
      },
    };

    const renderFunction = jestFail(done, (state) => {
      if (state) {
        expect(state).toEqual('10');
        done();
      }
      return <div />;
    });
    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
  });

  it('ignore correctly change when reducer returns null', (done) => {
    const actions = {
      get: {
        promise: () => Promise.resolve('text'),
        reducer: () => null,
      },
    };

    const onMount = (actions) => {
      actions.get();
    };

    const props = {
      actions,
      onMount,
      initialState: 'init',
    };

    const renderFunction = jestFail(done, (state, actions, loading, loadingMap) => {
      if (loadingMap.get === false) {
        expect(state).toEqual('init');
        done();
      }
      return <div />;
    });
    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
  });

  it('calls correctly pre-reducer', (done) => {
    type State = {
      value: string;
    };

    type Actions = {
      get: (arg1: string) => Promise<string>;
    };

    type Props = {
      id: string;
    };

    const initialState: State = {
      value: null,
    };

    const actions: StateDecoratorActions<State, Actions, Props> = {
      get: {
        promise: (arg1, s) => {
          // preReducer is executed before the promise
          expect(s.value).toEqual('pre');
          return new Promise((res, rej) => setTimeout(res, 300));
        },
        preReducer: (s, args, props) => {
          expect(args[0]).toEqual('arg1');
          expect(props.id).toEqual('10');

          return {
            ...s,
            value: 'pre',
          };
        },
        reducer: (s, data, args, props) => ({ ...s, value: 'final' }),
      },
    };

    const onMount = (actions) => {
      actions.get('arg1');
    };

    const props = {
      actions,
      onMount,
      initialState,
      props: {
        id: '10',
      },
    };

    const renderFunction = jestFail(done, (state, actions, loading, loadingMap) => {
      if (state.value === 'pre') {
        expect(loading).toBeTruthy();
        expect(loadingMap.get).toBeTruthy();
      }
      if (state.value === 'final') {
        done();
      }
      return <div />;
    });
    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
  });

  it('calls correctly pre-reducer with optimistic reducer', (done) => {
    type State = {
      value: string;
    };

    type Actions = {
      get: (arg1: string) => Promise<string>;
    };

    type Props = {
      id: string;
    };

    const initialState: State = {
      value: null,
    };

    const actions: StateDecoratorActions<State, Actions, Props> = {
      get: {
        promise: (arg1, s) => {
          // preReducer is executed before the promise
          expect(s.value).toEqual('pre');
          return new Promise((res, rej) => setTimeout(res, 300));
        },
        preReducer: (s, args, props) => {
          expect(args[0]).toEqual('arg1');
          expect(props.id).toEqual('10');

          return {
            ...s,
            value: 'pre',
          };
        },
        optimisticReducer: (s) => {
          // preReducer is executed before the optimistic reducer
          expect(s.value).toEqual('pre');
          return s;
        },
        reducer: (s, data, args, props) => ({ ...s, value: 'final' }),
      },
    };

    const onMount = (actions) => {
      actions.get('arg1');
    };

    const props = {
      actions,
      onMount,
      initialState,
      props: {
        id: '10',
      },
    };

    const renderFunction = jestFail(done, (state) => {
      if (state && state.value === 'final') {
        done();
      }
      return <div />;
    });
    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
  });

  it('calls notify success function correctly', (done) => {
    const notifySuccess = jest.fn();

    const actions: StateDecoratorActions<any, any, any> = {
      get: {
        promise: () => Promise.resolve('text'),
        successMessage: 'success',
        onDone: () => {
          expect(notifySuccess).toHaveBeenCalled();
          done();
        },
      },
    };

    const onMount = (actions) => {
      actions.get();
    };

    const props = {
      actions,
      onMount,
      notifySuccess,
      initialState: 'default',
    };

    const wrapper = shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);
  });

  it('calls notify error function correctly', (done) => {
    const notifyError = jest.fn();

    const actions: StateDecoratorActions<any, any, any> = {
      get: {
        promise: (param) => new Promise((_, reject) => setTimeout(reject, 100, 'text')),
        errorMessage: 'error message',
        rejectPromiseOnError: true,
      },
    };

    const onMount = jestFail(done, (actions) => {
      actions.get('param').catch((e) => {
        expect(notifyError).toHaveBeenCalled();
        done();
      });
    });

    const props = {
      actions,
      onMount,
      notifyError,
      initialState: 'default',
    };

    const wrapper = shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);
  });

  it('calls error function correctly', (done) => {
    const notifyError = jest.fn();

    const actions: StateDecoratorActions<any, any, any> = {
      get: {
        promise: (param) => new Promise((_, reject) => setTimeout(reject, 100, 'text')),
        getErrorMessage: jest.fn((error, args, props) => `error message ${props.id}`),
        rejectPromiseOnError: true,
      },
    };

    const onMount = jestFail(done, (actions) => {
      actions.get('param').catch((e) => {
        expect(notifyError).toHaveBeenCalledWith('error message 10');
        done();
      });
    });

    const props = {
      actions,
      onMount,
      notifyError,
      initialState: 'default',
      props: {
        id: '10',
      },
    };

    const wrapper = shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);
  });

  it('calls success function correctly', (done) => {
    const notifySuccess = jest.fn();

    const actions: StateDecoratorActions<any, any, any> = {
      get: {
        promise: (param) => new Promise((resolve) => setTimeout(resolve, 100, 'text')),
        getSuccessMessage: jest.fn((result, args, props) => `success message ${props.id}`),
      },
    };

    const onMount = jestFail(done, (actions) => {
      actions.get('param').then(() => {
        expect(notifySuccess).toHaveBeenCalledWith('success message 10');
        done();
      });
    });

    const props = {
      actions,
      onMount,
      notifySuccess,
      initialState: 'default',
      props: {
        id: '10',
      },
    };

    const wrapper = shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);
  });

  it('renders default state and all steps correctly', (done) => {
    const actions = {
      get: {
        promise: () => new Promise((resolve) => setTimeout(resolve, 100, 'text')),
        reducer: (old, data) => data,
      },
    };

    const onMount = (actions) => {
      actions.get();
    };

    const props = {
      actions,
      onMount,
      initialState: 'initial',
    };

    let loadingSet = false;

    const renderFunction = jestFail(done, (state, actions, loading) => {
      expect(state === 'initial' || state === 'text').toBeTruthy();

      if (loading) {
        loadingSet = true;
      }

      if (loadingSet && !loading) {
        expect(state === 'text').toBeTruthy();
        done();
      }

      return <div />;
    });
    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
  });

  it('handles error reducer correctly', (done) => {
    const actions = {
      get: {
        promise: () => new Promise((_, reject) => setTimeout(reject, 100, 'theError')),
        errorReducer: (s, error, args, props) => ({ ...s, error, id: props.id }),
        reducer: (s) => ({ ...s, res: 'text' }),
      },
    };

    const onMount = (actions) => {
      actions.get();
    };

    const props = {
      actions,
      onMount,
      initialState: {
        name: 'player',
        error: undefined,
      },
      props: { id: '10' },
    };

    const renderFunction = jestFail(done, (state, actions, loading, loadingMap) => {
      if (loadingMap['get'] === false) {
        expect(state.error).toEqual('theError');
        expect(state.res).toBeUndefined();
        expect(state.id).toEqual('10');
        expect(state.name).toEqual('player');
        done();
      } else {
        expect(state.error).toBeUndefined();
      }

      return <div />;
    });

    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
  });

  it('handles multiple requests correctly', (done) => {
    const actions = {
      get: {
        promise: () => new Promise((resolve) => setTimeout(resolve, 100, 'value1')),
        reducer: (s, data) => ({ ...s, get: data }),
      },
      get2: {
        promise: () => new Promise((resolve) => setTimeout(resolve, 200, 'value2')),
        reducer: (s, data) => ({ ...s, get2: data }),
      },
    };

    const onMount = (actions) => {
      actions.get();
      actions.get2();
    };

    const props = {
      actions,
      onMount,
      initialState: {
        get: undefined,
        get2: undefined,
      },
    };

    const renderFunction = jestFail(done, (state, actions, loading, loadingMap) => {
      if (loadingMap.get || loadingMap.get2) {
        expect(loading).toBeTruthy();
      }

      if (loading.get === false) {
        expect(state.get).toEqual('value1');
      }

      if (loading.get2 === false) {
        expect(state.get2).toEqual('value2');
      }

      if (loadingMap.get === false && loadingMap.get2 === false) {
        expect(loading).toBeFalsy();
        done();
      }

      return <div />;
    });

    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
  });

  it('call onDone correctly', (done) => {
    const actions = {
      get: {
        promise: (param) => Promise.resolve('text'),
        reducer: () => 'reducer',
        onDone: jestFail(done, (newData, result, args, props) => {
          expect(result).toEqual('text');
          expect(newData).toEqual('reducer');
          expect(args[0]).toEqual('param');
          expect(props.id).toEqual('10');
          done();
        }),
      },
    };

    const onMount = (actions) => {
      actions.get('param');
    };

    const props = {
      actions,
      onMount,
      props: {
        id: '10',
      },
    };

    const renderFunction = (state, actions, loading) => <div />;

    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
  });

  describe('optimistic', () => {
    it('call optimisticReducer & reducer correctly', (done) => {
      const actions: StateDecoratorActions<string, { get: (p: string) => Promise<string> }, any> = {
        get: {
          promise: (param) => new Promise((resolve) => setTimeout(resolve, 100, 'text')),
          reducer: (_, result) => result,
          optimisticReducer: jestFail(done, (state, args, props) => {
            expect(state).toEqual(undefined);
            expect(args[0]).toEqual('param');
            expect(props.id).toEqual('10');
            return 'tempData';
          }),
        },
      };

      const onMount = (actions) => {
        actions.get('param');
      };

      const props = {
        actions,
        onMount,
        props: {
          id: '10',
        },
      };

      const renderFunction = jestFail(done, (state, actions, loading, loadingMap) => {
        if (loadingMap.get === true) {
          expect(state).toEqual('tempData');
        }
        if (loadingMap.get === false) {
          expect(state).toEqual('text');
          done();
        }
        return <div />;
      });

      const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
    });

    it('reset data if optimisticReducer is called and the request fails with no reducer', (done) => {
      const actions = {
        get: {
          promise: (param) => new Promise((_, reject) => setTimeout(reject, 100, 'error')),
          errorReducer: () => null,
          optimisticReducer: jestFail(done, (currentData, args) => {
            expect(currentData).toEqual('initialState');
            expect(args[0]).toEqual('param');
            return 'optimistic';
          }),
        },
      };

      const onMount = (actions) => {
        actions.get('param');
      };

      const props = {
        actions,
        onMount,
      };

      const renderFunction = jestFail(done, (state, actions, loading, loadingMap) => {
        if (state === 'optimistic') {
          expect(loading).toBeFalsy();
        }
        if (loadingMap.get === false) {
          expect(state).toBe('initialState');
          done();
        }
        return <div />;
      });

      const wrapper = shallow(
        <StateDecorator {...props} initialState="initialState">
          {renderFunction}
        </StateDecorator>
      );
    });

    it('reset data if optimisticReducer is called and the request fails', (done) => {
      const actions = {
        get: {
          promise: (param) => new Promise((_, reject) => setTimeout(reject, 100, 'error')),
          errorReducer: (_, error) => error,
          optimisticReducer: jestFail(done, (currentData, args) => {
            expect(currentData).toEqual('initialState');
            expect(args[0]).toEqual('param');
            return 'optimistic';
          }),
        },
      };

      const onMount = (actions) => {
        actions.get('param');
      };

      const props = {
        actions,
        onMount,
      };

      const renderFunction = jestFail(done, (state, actions, loading, loadingMap) => {
        if (state === 'optimistic') {
          expect(loading).toBeFalsy();
        }
        if (loadingMap.get === false) {
          expect(state).toBe('error');
          done();
        }
        return <div />;
      });

      const wrapper = shallow(
        <StateDecorator {...props} initialState="initialState">
          {renderFunction}
        </StateDecorator>
      );
    });

    it('revert optimistic state correctly if an action was done before failing', (done) => {
      type State = { str: string; str2: string };
      type Actions = { asynch: () => Promise<string>; endAsynch: () => void; otherAction: () => void };

      let reject;
      const actions: StateDecoratorActions<State, Actions, any> = {
        asynch: {
          promise: () =>
            new Promise((_, rej) => {
              reject = rej;
            }),
          errorReducer: (s) => null,
          optimisticReducer: (state) => ({
            ...state,
            str: 'opti',
          }),
        },

        endAsynch: (s) => {
          reject();
          return s;
        },

        otherAction: (s) => ({
          ...s,
          str2: 'text',
        }),
      };

      const onMount = (actions: Actions) => {
        actions.asynch();
        actions.otherAction();
        actions.endAsynch();
      };

      const props = {
        actions,
        onMount,
        initialState: {
          str: 'init',
          str2: 'init',
        },
      };

      const renderFunction = jestFail(done, (state, actions, loading, loadingMap) => {
        if (loadingMap.asynch === true) {
          expect(state.str).toEqual('opti');
        }
        if (loadingMap.asynch === false) {
          expect(state.str).toEqual('init');
          expect(state.str2).toEqual('text');
          done();
        }
        return <div />;
      });

      const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
    });

    it('revert optimistic state correctly when 2 requests fail (2nd fails)', (done) => {
      type State = { str: string; str2: string; str3: string };
      type Actions = {
        asynch1: () => Promise<string>;
        endAsynch1: () => Promise<any>;
        asynch2: () => Promise<any>;
        failAsync2: () => Promise<any>;
        otherAction: (param: string) => void;
      };

      let reject1;
      let reject2;
      const actions: StateDecoratorActions<State, Actions, any> = {
        asynch1: {
          promise: () =>
            new Promise((_, rej) => {
              reject1 = rej;
            }),
          errorReducer: (s) => null,
          optimisticReducer: (s) => ({
            ...s,
            str: 'opti',
          }),
        },

        endAsynch1: (s) => {
          reject1();
          return s;
        },

        asynch2: {
          promise: () =>
            new Promise((_, rej) => {
              reject2 = rej;
            }),
          errorReducer: (s) => null,
          optimisticReducer: (s) => ({
            ...s,
            str2: 'opti',
          }),
        },

        failAsync2: (s) => {
          reject2();
          return s;
        },

        otherAction: (s, [param]) => ({
          ...s,
          str3: param,
        }),
      };

      const onMount = (actions: Actions) => {
        actions.asynch1();
        actions.otherAction('text');
        actions.asynch2();
        actions.otherAction('text2');
        actions.failAsync2().then(() => {
          actions.endAsynch1();
        });
      };

      const props = {
        actions,
        onMount,
        initialState: {
          str: 'init',
          str2: 'init',
          str3: 'init',
        },
      };

      const renderFunction = jestFail(done, (state, actions, loading, loadingMap) => {
        if (loadingMap.asynch1 === true) {
          expect(state.str).toEqual('opti');
        }
        if (loadingMap.asynch2 === true) {
          expect(state.str2).toEqual('opti');
        }

        if (loadingMap.asynch1 === true && loadingMap.asynch2 === false) {
          expect(state.str).toEqual('opti');
          expect(state.str2).toEqual('init');
          expect(state.str3).toEqual('text2');
          done();
        }

        if (loadingMap.asynch1 === false && loadingMap.asynch2 === false) {
          expect(state.str).toEqual('init');
          expect(state.str2).toEqual('init');
          expect(state.str3).toEqual('text2');
          done();
        }

        return <div />;
      });

      const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
    });

    it('revert optimistic state correctly when 2 requests fail (first fail)', (done) => {
      type State = { str: string; str2: string; str3: string };
      type Actions = {
        asynch1: () => Promise<string>;
        endAsynch1: () => Promise<any>;
        asynch2: () => Promise<any>;
        endAsynch2: () => Promise<any>;
        otherAction: (param: string) => void;
      };

      let reject1;
      let reject2;
      const actions: StateDecoratorActions<State, Actions, any> = {
        asynch1: {
          promise: () =>
            new Promise((_, rej) => {
              reject1 = rej;
            }),
          errorReducer: (s) => null,
          optimisticReducer: (s) => ({
            ...s,
            str: 'opti',
          }),
        },

        endAsynch1: (s) => {
          reject1();
          return s;
        },

        asynch2: {
          promise: () =>
            new Promise((_, rej) => {
              reject2 = rej;
            }),
          errorReducer: (s) => null,
          optimisticReducer: (s) => ({
            ...s,
            str2: 'opti',
          }),
        },

        endAsynch2: (s) => {
          reject2();
          return s;
        },

        otherAction: (s, [param]) => ({
          ...s,
          str3: param,
        }),
      };

      const onMount = (actions: Actions) => {
        actions.asynch1();
        actions.otherAction('text');
        actions.asynch2();
        actions.otherAction('text2');
        actions.endAsynch1().then(() => {
          actions.endAsynch2();
        });
      };

      const props = {
        actions,
        onMount,
        initialState: {
          str: 'init',
          str2: 'init',
          str3: 'init',
        },
      };

      const renderFunction = jestFail(done, (state, actions, loading, loadingMap) => {
        if (loadingMap.asynch1 === true) {
          expect(state.str).toEqual('opti');
        }
        if (loadingMap.asynch2 === true) {
          expect(state.str2).toEqual('opti');
        }
        if (loadingMap.asynch1 === false && loadingMap.asynch2 === true) {
          expect(state.str).toEqual('init');
          expect(state.str2).toEqual('opti');
          expect(state.str3).toEqual('text2');
        }
        if (loadingMap.asynch2 === false && loadingMap.asynch2 === false) {
          expect(state.str).toEqual('init');
          expect(state.str2).toEqual('init');
          expect(state.str3).toEqual('text2');
          done();
        }

        return <div />;
      });

      const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
    });

    it('handles optimistic state correctly when 2 requests one OK the other KO', (done) => {
      type State = { str: string; str2: string; str3: string };
      type Actions = {
        asynch1: () => Promise<string>;
        endAsynch1: () => Promise<any>;
        asynch2: () => Promise<any>;
        endAsynch2: () => Promise<any>;
        otherAction: (param: string) => void;
      };

      let reject1;
      let resolve2;
      const actions: StateDecoratorActions<State, Actions, any> = {
        asynch1: {
          promise: () =>
            new Promise((_, rej) => {
              reject1 = rej;
            }),
          errorReducer: (s) => null,
          optimisticReducer: (s) => ({
            ...s,
            str: 'opti',
          }),
        },

        endAsynch1: (s) => {
          reject1();
          return s;
        },

        asynch2: {
          promise: () =>
            new Promise((res) => {
              resolve2 = res;
            }),
          optimisticReducer: (s) => ({
            ...s,
            str2: 'opti',
          }),
        },

        endAsynch2: (s) => {
          resolve2();
          return s;
        },

        otherAction: (s, [param]) => ({
          ...s,
          str3: param,
        }),
      };

      const onMount = (actions: Actions) => {
        actions.asynch1();
        actions.otherAction('text');
        actions.asynch2();
        actions.otherAction('text2');
        actions.endAsynch2().then(() => {
          actions.endAsynch1();
        });
      };

      const props = {
        actions,
        onMount,
        initialState: {
          str: 'init',
          str2: 'init',
          str3: 'init',
        },
      };

      const renderFunction = jestFail(done, (state, actions, loading, loadingMap) => {
        if (loadingMap.asynch1 === true) {
          expect(state.str).toEqual('opti');
        }
        if (loadingMap.asynch2 === true) {
          expect(state.str2).toEqual('opti');
        }
        if (loadingMap.asynch1 === true && loadingMap.asynch2 === false) {
          expect(state.str).toEqual('init');
          expect(state.str2).toEqual('opti');
          expect(state.str3).toEqual('text2');
        }
        if (loadingMap.asynch2 === false && loadingMap.asynch2 === false) {
          expect(state.str).toEqual('init');
          expect(state.str2).toEqual('opti');
          expect(state.str3).toEqual('text2');
          done();
        }

        return <div />;
      });

      const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
    });
  });

  describe('Conflicting actions management', () => {
    it('handles 3 calls to an asynchronous action (keep last)', (done) => {
      type State = { str: string; count: number };
      type Actions = {
        asynch: (value: string, timeout: number) => Promise<string>;
      };

      const actions: StateDecoratorActions<State, Actions, any> = {
        asynch: {
          promise: ([value, timeout]) => new Promise((res) => setTimeout(res, timeout, value)),
          reducer: (s, res): State => ({
            str: res,
            count: s.count + 1,
          }),
          conflictPolicy: ConflictPolicy.KEEP_LAST,
        },
      };

      const onMount = (actions: Actions) => {
        actions.asynch('value 1', 200).catch((e) => done.fail(e));
        actions.asynch('value 2', 0).catch((e) => done.fail(e));
        actions.asynch('value 3', 0).catch((e) => done.fail(e));
      };

      const props = {
        actions,
        onMount,
        initialState: {
          str: 'init',
          count: 0,
        } as State,
      };

      const renderFunction = jestFail(done, (state: State, actions, loading, loadingMap) => {
        if (state.str === 'value 3') {
          expect(state.count).toBe(2);
          done();
        }

        return <div />;
      });

      const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
    });

    it('handles 3 calls to an asynchronous action (keep all)', (done) => {
      type State = { str: string; count: number };
      type Actions = {
        asynch: (value: string, timeout: number) => Promise<string>;
      };

      const actions: StateDecoratorActions<State, Actions, any> = {
        asynch: {
          promise: ([value, timeout]) => new Promise((res) => setTimeout(res, timeout, value)),
          reducer: (s, res): State => ({
            str: res,
            count: s.count + 1,
          }),
          conflictPolicy: ConflictPolicy.KEEP_ALL,
        },
      };

      const onMount = (actions: Actions) => {
        actions.asynch('value 1', 200).catch((e) => done.fail(e));
        actions.asynch('value 2', 100).catch((e) => done.fail(e));
        actions.asynch('value 3', 0).catch((e) => done.fail(e));
      };

      const props = {
        actions,
        onMount,
        initialState: {
          str: 'init',
          count: 0,
        } as State,
      };

      const renderFunction = jestFail(done, (state: State, actions, loading, loadingMap) => {
        if (state.str === 'value 3') {
          expect(state.count).toBe(3);
          done();
        }

        return <div />;
      });

      const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
    });

    it('handles 3 calls to an asynchronous action (ignore)', (done) => {
      type State = { str: string; count: number };
      type Actions = {
        asynch: (value: string, timeout: number) => Promise<string>;
      };

      const actions: StateDecoratorActions<State, Actions, any> = {
        asynch: {
          promise: ([value, timeout]) => new Promise((res) => setTimeout(res, timeout, value)),
          reducer: (s, res): State => ({
            str: res,
            count: s.count + 1,
          }),
          conflictPolicy: ConflictPolicy.IGNORE,
        },
      };

      const onMount = (actions: Actions) => {
        actions.asynch('value 1', 200).catch((e) => done.fail(e));
        actions.asynch('value 2', 0).catch((e) => done.fail(e));
        actions.asynch('value 3', 0).catch((e) => done.fail(e));
      };

      const props = {
        actions,
        onMount,
        initialState: {
          str: 'init',
          count: 0,
        } as State,
      };

      let saveState: State;

      const renderFunction = jestFail(done, (state: State, actions, loading, loadingMap) => {
        saveState = state;
        return <div />;
      });

      const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);

      return new Promise((res) => {
        setTimeout(() => {
          expect(saveState.count).toBe(1);
          expect(saveState.str).toBe('value 1');
          res();
          done();
        }, 300);
      });
    });

    it('handles 3 calls to an asynchronous action (reject)', (done) => {
      type State = { str: string; count: number };
      type Actions = {
        asynch: (value: string, timeout: number) => Promise<string>;
      };

      const actions: StateDecoratorActions<State, Actions, any> = {
        asynch: {
          promise: ([value, timeout]) => new Promise((res) => setTimeout(res, timeout, value)),
          reducer: (s, res): State => ({
            str: res,
            count: s.count + 1,
          }),
          conflictPolicy: ConflictPolicy.REJECT,
        },
      };

      const onMount = (actions: Actions) => {
        actions.asynch('value 1', 200).catch((e) => done.fail(e));
        actions.asynch('value 2', 0).catch((e) => done());
      };

      const props = {
        actions,
        onMount,
        initialState: {
          str: 'init',
          count: 0,
        } as State,
      };

      const renderFunction = jestFail(done, (state: State, actions, loading, loadingMap) => {
        return <div />;
      });

      const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
    });

    it('handles 3 calls to an asynchronous action (parallel)', (done) => {
      type State = { users: { [k: string]: string }; count: number };
      type Actions = {
        asynch: (userId: string, value: string, timeout: number) => Promise<string>;
      };

      const actions: StateDecoratorActions<State, Actions, any> = {
        asynch: {
          promise: (userId, value, timeout) => new Promise((res) => setTimeout(res, timeout, value)),
          reducer: (s, res, [userId, value]): State => ({
            users: {
              ...s.users,
              [userId]: value,
            },
            count: s.count + 1,
          }),
          conflictPolicy: ConflictPolicy.PARALLEL,
          getPromiseId: (userId) => userId,
        },
      };

      const onMount = (actions: Actions) => {
        Promise.all([
          actions.asynch('user1', 'value 1', 100).catch((e) => done.fail(e)),
          actions.asynch('user2', 'value 2', 300).catch((e) => done.fail(e)),
          actions.asynch('user3', 'value 3', 200).catch((e) => done.fail(e)),
        ]).then(() => {
          setTimeout(() => {
            actions.asynch('user4', 'value 4', 100).catch((e) => done.fail(e));
            actions.asynch('user5', 'value 5', 300).catch((e) => done.fail(e));
          }, 300);
        });
      };

      const props = {
        actions,
        onMount,
        initialState: {
          users: {},
          count: 0,
        } as State,
      };

      const renderFunction = jestFail(done, (state: State, actions, loading, loadingMap, loadingParallelMap) => {
        if (state.count > 0 && state.count !== 5) {
          if (!loadingParallelMap.asynch['user1']) {
            expect(state.users['user1']).toEqual('value 1');
          }
        }
        if (loadingMap.asyncAction) {
          expect(Object.keys(loadingParallelMap.asyncAction).length).toBeGreaterThan(0);
        }
        if (state.count === 5) {
          done();
        }

        return <div />;
      });

      const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
    });
  });

  it('exposes the actions in the Asynch action', (done) => {
    const notifySuccess = jest.fn();

    type Actions = {
      get: () => Promise<string>;
      asyncAction: () => Promise<void>;
      syncAction: () => void;
    };

    const actions: StateDecoratorActions<string, Actions, {}> = {
      get: {
        promise: jestFail(done, (args, state, props, actions: Actions) => {
          expect(actions.asyncAction).toBeDefined();
          expect(actions.syncAction).toBeDefined();
          actions.syncAction();
          return Promise.resolve('text');
        }),
        successMessage: 'success',
        onDone: () => {
          done();
        },
      },
      asyncAction: {
        promise: () => Promise.resolve(''),
      },
      // no action in synch action, must be pure reducer
      syncAction: jestFail(done, (state, props, actions) => {
        expect(actions).toBeUndefined();
        return '';
      }),
    };

    const onMount = (actions) => {
      actions.get();
    };

    const props = {
      actions,
      onMount,
      notifySuccess,
      initialState: 'default',
    };

    const wrapper = shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);
  });

  it('calls optimistic reducer before promise (ease chaining use case)', (done) => {
    type State = {
      toSetBefore: boolean;
      result: any;
    };

    const initialState: State = {
      toSetBefore: false,
      result: undefined,
    };

    type Actions = {
      get: () => Promise<any>;
    };

    const actions: StateDecoratorActions<State, Actions, any> = {
      get: {
        promise: jestFail(done, (args, state) => {
          expect(state.toSetBefore).toBeTruthy();
          return Promise.resolve('result');
        }),
        optimisticReducer: (s) => ({ ...s, toSetBefore: true }),
      },
    };

    const onMount = (actions) => {
      actions
        .get()
        .then((result) => {
          expect(result).toEqual('result');
        })
        .then(done);
    };

    const props = {
      actions,
      onMount,
      initialState,
    };

    shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);
  });

  describe('On props change', () => {
    it('when no props of interest change, callbacks are not called 1', () => {
      type Item = {
        id: string;
        value: string;
      };

      type State = {
        item: Item;
      };

      const initialState: State = {
        item: {
          id: 'id1',
          value: 'value1',
        },
      };

      type Actions = {
        get: () => any;
      };

      const actions: StateDecoratorActions<State, Actions, any> = {
        get: (s) => s,
      };

      const props: StateDecoratorProps<State, Actions, ItemMap> = {
        actions,
        initialState,
        getPropsRefValues: (p) => [],
        onPropsChange: jest.fn(),
        onPropsChangeReducer: jest.fn(),
        props: {
          item: {
            id: 'id1',
            value: 'value1',
          },
        },
      };

      const wrapper = shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);

      wrapper.setProps({
        item: {
          id: 'id2',
          value: 'value2',
        },
      });

      expect(props.onPropsChange).not.toHaveBeenCalled();
      expect(props.onPropsChangeReducer).not.toHaveBeenCalled();
    });

    it('when no props of interest change, callbacks are not called 2', () => {
      type Item = {
        id: string;
        value: string;
      };

      type State = {
        item: Item;
        item2: Item;
      };

      const initialState: State = {
        item: {
          id: 'id1',
          value: 'value1',
        },
        item2: {
          id: 'id1',
          value: 'value1',
        },
      };

      type Actions = {
        get: () => any;
      };

      const actions: StateDecoratorActions<State, Actions, any> = {
        get: (s) => s,
      };

      const props: StateDecoratorProps<State, Actions, ItemMap> = {
        actions,
        initialState,
        getPropsRefValues: (p) => [p.item.id],
        onPropsChange: jest.fn(),
        onPropsChangeReducer: jest.fn(),
        props: {
          item: {
            id: 'id1',
            value: 'value1',
          },
        },
      };

      const wrapper = shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);

      wrapper.setProps({
        item2: {
          id: 'id2',
          value: 'value2',
        },
      });

      expect(props.onPropsChange).not.toHaveBeenCalled();
      expect(props.onPropsChangeReducer).not.toHaveBeenCalled();
    });

    it('when one prop of interest change, callbacks are called', (done) => {
      type Item = {
        id: string;
        value: string;
      };

      type State = {
        item: Item;
        item2: Item;
      };

      const initialState: State = {
        item: {
          id: 'id1',
          value: 'value1',
        },
        item2: {
          id: 'id1',
          value: 'value1',
        },
      };

      type Actions = {
        get: () => any;
        action2: () => any;
      };

      const action2Mock = jest.fn();

      const actions: StateDecoratorActions<State, Actions, any> = {
        get: (s) => s,
        action2: (s) => {
          action2Mock();
          return s;
        },
      };

      const props: StateDecoratorProps<State, Actions, ItemMap> = {
        actions,
        initialState,
        getPropsRefValues: (p) => [p && p.item.id, p && p.item2.id],
        onPropsChange: jest.fn((s, p, a, indices) => {
          expect(s.item.id).toEqual('id2');
          expect(p.item.id).toEqual('id2');
          expect(a.get).toBeInstanceOf(Function);
          expect(indices).toEqual([0]);
          a.action2();
          done();
        }),
        onPropsChangeReducer: jest.fn((s, p) => ({ ...s, item: p.item })),
        props: {
          item: {
            id: 'id1',
            value: 'value1',
          },
          item2: {
            id: 'id1',
            value: 'value1',
          },
        },
      };

      let stateHasChanged = false;

      const renderFunction = jestFail(done, (state: State, actions, loading, loadingMap, loadingParallelMap) => {
        if (state.item.id === 'id2') {
          stateHasChanged = true;
        }

        return <div />;
      });

      const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);

      wrapper.setProps({
        props: {
          ...props.props,
          item: {
            id: 'id2',
            value: 'value2',
          },
        },
      });

      expect(props.onPropsChangeReducer).toHaveBeenCalled();
      expect(stateHasChanged).toBeTruthy();
    });
  });
});

describe('Type guards', () => {
  const actions: StateDecoratorActions<
    string,
    {
      asyncAction: () => Promise<void>;
      syncAction: () => void;
    },
    {}
  > = {
    asyncAction: {
      promise: () => Promise.resolve(''),
    },
    syncAction: (state, props, actions) => {
      return '';
    },
  };

  it('test asynchronous actions correctly', () => {
    expect(isAsyncAction(actions.asyncAction)).toBeTruthy();
    expect(isSyncAction(actions.asyncAction)).toBeFalsy();
  });

  it('test synchronous actions correctly', () => {
    expect(isSyncAction(actions.syncAction)).toBeTruthy();
    expect(isAsyncAction(actions.syncAction)).toBeFalsy();
  });
});

describe('retryDecorator', () => {
  it('3 retries, immediate success', () => {
    const arg1 = 'arg1';
    const arg2 = 'arg2';

    const f: PromiseProvider<any, any, any, any> = ([arg1, arg2]) => {
      expect(arg1).toBe(arg1);
      expect(arg2).toBe(arg2);
      return Promise.resolve('OK');
    };

    return retryDecorator(f, 3)([arg1, arg2], null, null, null);
  });

  it('3 retries, 1 error, 1 success', () => {
    const arg1 = 'arg1';
    const arg2 = 'arg2';

    let count = 1;
    const f = (arg1, arg2) => {
      expect(arg1).toBe(arg1);
      expect(arg2).toBe(arg2);
      if (count++ === 1) {
        return Promise.reject(new TypeError());
      }
      return Promise.resolve('OK');
    };

    return retryDecorator(f, 3, 0)([arg1, arg2], null, null, null).then((res) => expect(res).toBe('OK'));
  });

  it('3 retries, 3 failures', (done) => {
    const arg1 = 'arg1';
    const arg2 = 'arg2';

    const f = (arg1, arg2) => {
      expect(arg1).toBe(arg1);
      expect(arg2).toBe(arg2);
      return Promise.reject(new TypeError());
    };

    return retryDecorator(f, 3, 0)([arg1, arg2], null, null, null)
      .then(() => done.fail())
      .catch((e) => {
        expect(e).toBeInstanceOf(TypeError);
        done();
      });
  });

  it('3 retries, 1 different failure', (done) => {
    const arg1 = 'arg1';
    const arg2 = 'arg2';

    const f = (arg1, arg2) => {
      expect(arg1).toBe(arg1);
      expect(arg2).toBe(arg2);
      throw new Error();
    };

    return retryDecorator(f, 3)([arg1, arg2], null, null, null)
      .then(() => done.fail())
      .catch((e) => {
        expect(e).not.toBeInstanceOf(TypeError);
        done();
      });
  });

  it('3 retries, 1 retry error', (done) => {
    const arg1 = 'arg1';
    const arg2 = 'arg2';

    const isRetryError = (e: Error) => {
      return e.message === 'OK';
    };

    let count = 1;
    const f = (arg1, arg2) => {
      expect(arg1).toBe(arg1);
      expect(arg2).toBe(arg2);
      if (count++ === 1) {
        return Promise.reject(new Error('OK'));
      }
      return Promise.resolve('OK');
    };

    return retryDecorator(f, 3, 0, isRetryError)([arg1, arg2], null, null, null)
      .then((res) => {
        expect(res).toEqual('OK');
        done();
      })
      .catch(done.fail);
  });

  describe('Testing utilities', () => {
    type State = {
      value: number;
    };
    type Actions = {
      increment: (v: number) => void;
      incrAsync: (v: number) => Promise<number>;
    };
    type Props = {};

    const actions: StateDecoratorActions<State, Actions, Props> = {
      increment: (s, [incr], props) => {
        return {
          value: s.value + incr,
        };
      },
      incrAsync: {
        promise: ([incr]) => Promise.resolve(incr),
        reducer: (s, incr) => ({ value: s.value + incr }),
      },
    };

    it('testSyncAction (correct type)', (done) => {
      const p = testSyncAction(actions.increment, (action) => {
        expect(action).toBeDefined();
        done();
      });

      p && p.catch((e) => done.fail(e));
    });

    it('testSyncAction (incorrect type)', (done) => {
      const testFunc = jest.fn();

      testSyncAction(actions.incrAsync, testFunc).catch((e) => {
        expect(testFunc).not.toHaveBeenCalled();
        done();
      });
    });

    it('testAsyncAction (correct type)', (done) => {
      const p = testAsyncAction(actions.incrAsync, (action) => {
        expect(action).toBeDefined();
        done();
      });
      p && p.catch((e) => done.fail(e));
    });

    it('testAsyncAction (incorrect type)', (done) => {
      const testFunc = jest.fn();

      testAsyncAction(actions.increment, testFunc).catch((e) => {
        expect(testFunc).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
