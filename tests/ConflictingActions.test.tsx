import React from 'react';
import { shallow } from 'enzyme';
import StateDecorator, { StateDecoratorActions } from '../src/StateDecorator';
import { ConflictPolicy } from '../src/types';

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

describe('Conflicting actions management', () => {
  it('handles 2 calls to an asynchronous action (keep_all + null in 2nd call)', (done) => {
    type State = { count: number };
    type Actions = {
      getData: (value: string) => Promise<string>;
    };

    let count = 1;

    const actions: StateDecoratorActions<State, Actions, any> = {
      getData: {
        promise: ([value]) => {
          if (count === 1 || count === 3) {
            count = 2;
            return new Promise((res) => {
              setTimeout(res, 200, value);
            });
          }
          count++;
          return null;
        },
        reducer: (s): State => ({
          count: s.count + 1,
        }),
        conflictPolicy: ConflictPolicy.KEEP_ALL,
      },
    };

    const onMount = jestFail(done, (actions: Actions) => {
      actions.getData('id1').catch((e) => done.fail(e));
      actions.getData('id1').catch((e) => done.fail(e));
      actions
        .getData('id1')
        .then(() => {
          done();
        })
        .catch((e) => done.fail(e));
    });

    const props = {
      actions,
      onMount,
      initialState: {
        count: 0,
      } as State,
    };

    const renderFunction = jestFail(done, () => <div />);

    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
  });

  it('handles 2 calls to an asynchronous action (reuse)', (done) => {
    type State = { count: number };
    type Actions = {
      getData: (value: string) => Promise<string>;
    };

    const actions: StateDecoratorActions<State, Actions, any> = {
      getData: {
        promise: ([value]) => new Promise((res) => setTimeout(res, 200, value)),
        reducer: (s): State => ({
          count: s.count + 1,
        }),
        conflictPolicy: ConflictPolicy.REUSE,
      },
    };

    const onMount = (actions: Actions) => {
      const p1 = actions.getData('id1').catch((e) => done.fail(e));
      const p2 = actions.getData('id1').catch((e) => done.fail(e));
      expect(p1 === p2);
    };

    const props = {
      actions,
      onMount,
      initialState: {
        count: 0,
      } as State,
    };

    const renderFunction = jestFail(done, (state: State, actions, loading, loadingMap) => {
      if (state.count === 1) {
        done();
      }
      return <div />;
    });

    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
  });

  it('handles 2 calls to an asynchronous action (reuse)', (done) => {
    type State = { count: number; res: string };
    type Actions = {
      getData: (value: string) => Promise<string>;
    };

    let timeout = 100;

    const actions: StateDecoratorActions<State, Actions, any> = {
      getData: {
        promise: ([value]) =>
          new Promise((res) => {
            setTimeout(res, timeout, value);
            timeout = timeout + 200;
          }),
        reducer: (s, res): State => ({
          res,
          count: s.count + 1,
        }),
        conflictPolicy: ConflictPolicy.REUSE,
      },
    };

    const onMount = (actions: Actions) => {
      const p1 = actions.getData('id1').catch((e) => done.fail(e));
      const p2 = actions.getData('id2').catch((e) => done.fail(e));
      expect(p1 !== p2);
      p2.then(() => {
        done();
      });
    };

    const props = {
      actions,
      onMount,
      initialState: {
        count: 0,
      } as State,
    };

    const renderFunction = jestFail(done, (state: State, actions, loading, loadingMap) => {
      return <div />;
    });

    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);
  });

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
