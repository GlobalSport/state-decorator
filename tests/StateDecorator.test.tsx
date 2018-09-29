import React from 'react';
import { shallow } from 'enzyme';
import StateDecorator, {
  isAsyncAction,
  isSyncAction,
  StateDecoratorActions,
  ConflictPolicy,
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

describe('StateDecorator', () => {
  it('handles synchronous action on mount', (done) => {
    let wrapper;

    const actions = {
      action: (state, name, value, props) => ({ name, value, id: props.id }),
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

    const actions: StateDecoratorActions<S, A> = {
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

    wrapper = shallow(<StateDecorator<S, A> {...props}>{() => <div />}</StateDecorator>);
  });

  it('load on mount', (done) => {
    const actions = {
      get: {
        promise: (state, props) =>
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
        promise: () => Promise.resolve('coucou'),
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
        expect(data).toEqual('coucou');
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
        promise: () => Promise.resolve('coucou'),
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
        promise: () => Promise.resolve('coucou'),
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

  it('calls notify success function correctly', (done) => {
    const notifySuccess = jest.fn();

    const actions: StateDecoratorActions<any, any> = {
      get: {
        promise: () => Promise.resolve('coucou'),
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

    const actions: StateDecoratorActions<any, any> = {
      get: {
        promise: (param) => new Promise((_, reject) => setTimeout(reject, 100, 'coucou')),
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

    const actions: StateDecoratorActions<any, any> = {
      get: {
        promise: (param) => new Promise((_, reject) => setTimeout(reject, 100, 'coucou')),
        getErrorMessage: jest.fn((error, args, props) => 'error message ' + props.id),
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

    const actions: StateDecoratorActions<any, any> = {
      get: {
        promise: (param) => new Promise((resolve) => setTimeout(resolve, 100, 'coucou')),
        getSuccessMessage: jest.fn((result, args, props) => 'success message ' + props.id),
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
        promise: () => new Promise((resolve) => setTimeout(resolve, 100, 'coucou')),
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
      expect(state === 'initial' || state === 'coucou').toBeTruthy();

      if (loading) {
        loadingSet = true;
      }

      if (loadingSet && !loading) {
        expect(state === 'coucou').toBeTruthy();
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
        reducer: (s) => ({ ...s, res: 'coucou' }),
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
        promise: (param) => Promise.resolve('coucou'),
        reducer: () => 'reducer',
        onDone: jestFail(done, (newData, result, args, props) => {
          expect(result).toEqual('coucou');
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
      const actions: StateDecoratorActions<string, { get: (p: string) => Promise<string> }> = {
        get: {
          promise: (param) => new Promise((resolve) => setTimeout(resolve, 100, 'coucou')),
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
          expect(state).toEqual('coucou');
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
      const actions: StateDecoratorActions<State, Actions> = {
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
          str2: 'coucou',
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
          expect(state.str2).toEqual('coucou');
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
        endAsynch2: () => Promise<any>;
        otherAction: (param: string) => void;
      };

      let reject1;
      let reject2;
      const actions: StateDecoratorActions<State, Actions> = {
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

        otherAction: (s, param) => ({
          ...s,
          str3: param,
        }),
      };

      const onMount = (actions: Actions) => {
        actions.asynch1();
        actions.otherAction('coucou');
        actions.asynch2();
        actions.otherAction('coucou2');
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
          expect(state.str).toEqual('opti');
          expect(state.str2).toEqual('init');
          expect(state.str3).toEqual('coucou2');
          done();
        }

        if (loadingMap.asynch1 === false && loadingMap.asynch2 === false) {
          expect(state.str).toEqual('init');
          expect(state.str2).toEqual('init');
          expect(state.str3).toEqual('coucou2');
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
      const actions: StateDecoratorActions<State, Actions> = {
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

        otherAction: (s, param) => ({
          ...s,
          str3: param,
        }),
      };

      const onMount = (actions: Actions) => {
        actions.asynch1();
        actions.otherAction('coucou');
        actions.asynch2();
        actions.otherAction('coucou2');
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
          expect(state.str3).toEqual('coucou2');
        }
        if (loadingMap.asynch2 === false && loadingMap.asynch2 === false) {
          expect(state.str).toEqual('init');
          expect(state.str2).toEqual('init');
          expect(state.str3).toEqual('coucou2');
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
      const actions: StateDecoratorActions<State, Actions> = {
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

        otherAction: (s, param) => ({
          ...s,
          str3: param,
        }),
      };

      const onMount = (actions: Actions) => {
        actions.asynch1();
        actions.otherAction('coucou');
        actions.asynch2();
        actions.otherAction('coucou2');
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
          expect(state.str3).toEqual('coucou2');
        }
        if (loadingMap.asynch2 === false && loadingMap.asynch2 === false) {
          expect(state.str).toEqual('init');
          expect(state.str2).toEqual('opti');
          expect(state.str3).toEqual('coucou2');
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

      const actions: StateDecoratorActions<State, Actions> = {
        asynch: {
          promise: (value, timeout) => new Promise((res) => setTimeout(res, timeout, value)),
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

      const actions: StateDecoratorActions<State, Actions> = {
        asynch: {
          promise: (value, timeout) => new Promise((res) => setTimeout(res, timeout, value)),
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

      const actions: StateDecoratorActions<State, Actions> = {
        asynch: {
          promise: (value, timeout) => new Promise((res) => setTimeout(res, timeout, value)),
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

      const actions: StateDecoratorActions<State, Actions> = {
        asynch: {
          promise: (value, timeout) => new Promise((res) => setTimeout(res, timeout, value)),
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
  });

  it('exposes the actions in the Asynch action', (done) => {
    const notifySuccess = jest.fn();

    type Actions = {
      get: () => Promise<string>;
      asyncAction: () => Promise<void>;
      syncAction: () => void;
    };

    const actions: StateDecoratorActions<string, Actions> = {
      get: {
        promise: jestFail(done, (state, props, actions: Actions) => {
          expect(actions.asyncAction).toBeDefined();
          expect(actions.syncAction).toBeDefined();
          actions.syncAction();
          return Promise.resolve('coucou');
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
});

describe('Type guards', () => {
  const actions: StateDecoratorActions<
    string,
    {
      asyncAction: () => Promise<void>;
      syncAction: () => void;
    }
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
