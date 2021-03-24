import {
  getInitialHookState,
  createNewHookState,
  decorateAsyncAction,
  processSideEffects,
  addNewSideEffect,
} from '../../src/useStateDecorator';
import { StateDecoratorActions, ConflictPolicy, AsynchActionPromise } from '../../src/types';
import { getTimeoutPromise, getAsyncContext } from './testUtils';

describe('createNewHookState', () => {
  type S = {
    value: string;
  };
  type A = {
    setValue: (v: string) => void;
  };

  const actions: StateDecoratorActions<S, A> = {
    setValue: (s, [value]) => ({ ...s, value }),
  };

  it('sets the new state', () => {
    const oldHookState = getInitialHookState(() => ({ value: 'initial' }), {}, {});
    const newHookState = createNewHookState(oldHookState, 'setValue', null, null, { value: 'newValue' }, true, null);
    expect(oldHookState === newHookState).toBeFalsy();
  });

  it('sets the loading state', () => {
    const oldHookState = getInitialHookState(() => ({ value: 'initial' }), {}, {});
    oldHookState.loadingMap.setValue = false;
    const newHookState = createNewHookState(oldHookState, 'setValue', null, null, { value: 'newValue' }, true, null);

    expect(oldHookState === newHookState).toBeFalsy();
    expect(newHookState.loadingMap.setValue).toBeTruthy();
  });

  it('sets the loading state (false)', () => {
    const oldHookState = getInitialHookState(() => ({ value: 'initial' }), {}, {});
    oldHookState.loadingMap.setValue = true;
    const newHookState = createNewHookState(oldHookState, 'setValue', null, null, { value: 'newValue' }, false, null);

    expect(oldHookState === newHookState).toBeFalsy();
    expect(newHookState.loadingMap.setValue).toBeFalsy();
  });

  it('sets the parallel loading state to true', () => {
    const oldHookState = getInitialHookState(() => ({ value: 'initial' }), {}, {});
    oldHookState.loadingMap.setValue = true;
    oldHookState.loadingParallelMap.setValue = {};
    const newHookState = createNewHookState(
      oldHookState,
      'setValue',
      ConflictPolicy.PARALLEL,
      'id',
      { value: 'newValue' },
      true,
      null
    );

    expect(oldHookState === newHookState).toBeFalsy();
    expect(newHookState.loadingMap.setValue).toBeTruthy();
    expect(newHookState.loadingParallelMap.setValue.id).toBeTruthy();
    expect(newHookState.state.value).toEqual('newValue');
  });

  it('sets the parallel loading state to false', () => {
    const oldHookState = getInitialHookState(() => ({ value: 'initial' }), {}, {});
    oldHookState.loadingMap.setValue = true;
    oldHookState.loadingParallelMap.setValue = { otherId: true, id: true };
    const newHookState = createNewHookState(
      oldHookState,
      'setValue',
      ConflictPolicy.PARALLEL,
      'id',
      { value: 'newValue' },
      false,
      null
    );

    expect(oldHookState === newHookState).toBeFalsy();
    expect(newHookState.loadingMap.setValue).toBeTruthy();
    expect(newHookState.loadingParallelMap.setValue.otherId).toBeTruthy();
    expect(newHookState.loadingParallelMap.setValue.id).toBeFalsy();
    expect(newHookState.state.value).toEqual('newValue');
  });

  it('sets the parallel loading state to false (last value)', () => {
    const oldHookState = getInitialHookState(() => ({ value: 'initial' }), {}, {});
    oldHookState.loadingMap.setValue = true;
    oldHookState.loadingParallelMap.setValue = { id: true };
    const newHookState = createNewHookState(
      oldHookState,
      'setValue',
      ConflictPolicy.PARALLEL,
      'id',
      { value: 'newValue' },
      false,
      null
    );

    expect(oldHookState === newHookState).toBeFalsy();
    expect(newHookState.loadingMap.setValue).toBeFalsy();
    expect(newHookState.loadingParallelMap.setValue.id).toBeFalsy();
  });
});

describe('ConflictPolicy', () => {
  type S = { value: string };
  type A = {
    setValue: (value: string, timeout?: number) => Promise<string>;
  };
  type P = {
    prop: string;
  };

  it("handles 4 calls to an asynchronous action (keep_all + null in 2nd call)'", (done) => {
    const ctx = getAsyncContext();

    let count = 1;
    const saveRes = [];
    const actions: StateDecoratorActions<S, A, P> = {
      setValue: {
        promise: ([value]) => {
          if (count === 2) {
            count++;
            return null;
          }

          count++;
          return getTimeoutPromise(100, value).then((res) => {
            saveRes.push(res);
            return res;
          });
        },
        reducer: (s, value) => ({ ...s, value: `${s.value}_${value}` }),
        conflictPolicy: ConflictPolicy.KEEP_ALL,
      },
    };

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.unmountedRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      { logEnabled: true },
      ctx.addSideEffect
    );

    ctx.actionsRef.current.setValue = action;

    action('id1').catch((e) => done.fail(e));

    action('id2');

    action('id3');

    action('id4')
      .then(() => {
        expect(saveRes).toEqual(['id1', 'id3', 'id4']);
        done();
      })
      .catch((e) => done.fail(e));
  });

  it('handles 2 calls to an asynchronous action (reuse)', (done) => {
    const ctx = getAsyncContext();

    const actions: StateDecoratorActions<S, A, P> = {
      setValue: {
        promise: ([value]) => getTimeoutPromise(100, value),
        reducer: (s, value) => ({ ...s, value: `${s.value}_${value}` }),
        conflictPolicy: ConflictPolicy.REUSE,
      },
    };

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.unmountedRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      { logEnabled: true },
      ctx.addSideEffect
    );

    ctx.actionsRef.current.setValue = action;

    const p1 = action('id1');
    const p2 = action('id1');
    expect(p1 === p2).toBeTruthy();

    done();
  });

  it('handles 2 calls to an asynchronous action (reuse, not same arguments)', (done) => {
    const ctx = getAsyncContext();

    const actions: StateDecoratorActions<S, A, P> = {
      setValue: {
        promise: ([value]) => getTimeoutPromise(100, value),
        reducer: (s, value) => ({ ...s, value: `${s.value}_${value}` }),
        conflictPolicy: ConflictPolicy.REUSE,
      },
    };

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.unmountedRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      {},
      ctx.addSideEffect
    );

    ctx.actionsRef.current.setValue = action;

    const p1 = action('id1');
    const p2 = action('id2');
    expect(p1 !== p2).toBeTruthy();

    done();
  });

  it('handles 2 calls to an asynchronous action (reject)', (done) => {
    const ctx = getAsyncContext();

    const actions: StateDecoratorActions<S, A, P> = {
      setValue: {
        promise: ([value]) => getTimeoutPromise(100, value),
        reducer: (s, value) => ({ ...s, value: `${s.value}_${value}` }),
        conflictPolicy: ConflictPolicy.REJECT,
      },
    };

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.unmountedRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      {},
      ctx.addSideEffect
    );

    ctx.actionsRef.current.setValue = action;

    const p1 = action('id1');
    const p2 = action('id2')
      .then(() => {
        done.fail();
      })
      .catch((e) => {
        done();
      });
  });

  it('handles 3 calls to an asynchronous action (ignore)', (done) => {
    const ctx = getAsyncContext();

    const saveRes = [];
    const actions: StateDecoratorActions<S, A, P> = {
      setValue: {
        promise: ([value, timeout]) => {
          return getTimeoutPromise(timeout, value).then((res) => {
            saveRes.push(res);
            return res;
          });
        },
        reducer: (s, value) => ({ ...s, value }),
        conflictPolicy: ConflictPolicy.IGNORE,
      },
    };

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.unmountedRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      {},
      ctx.addSideEffect
    );

    ctx.actionsRef.current.setValue = action;

    const p1 = action('id1', 100);
    const p2 = action('id2', 0); // will be dropped
    const p3 = action('id3', 0); // will be dropped
    const p4 = getTimeoutPromise(200) // wait p1 to be done
      .then(() => action('id4', 0))
      .then(() => {
        expect(saveRes).toEqual(['id1', 'id4']);
        done();
      });
  });

  it('handles 3 calls to an asynchronous action (parallel)', (done) => {
    const ctx = getAsyncContext();

    const saveRes = [];
    const actions: StateDecoratorActions<S, A, P> = {
      setValue: {
        promise: ([value, timeout]) => {
          return getTimeoutPromise(timeout, value).then((res) => {
            saveRes.push(res);
            return res;
          });
        },
        getPromiseId: (value) => value,
        reducer: (s, value) => ({ ...s, value }),
        conflictPolicy: ConflictPolicy.PARALLEL,
      },
    };

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.unmountedRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      {},
      ctx.addSideEffect
    );

    ctx.actionsRef.current.setValue = action;

    // all promises are run in || and resolving in reverse order because of timeout.
    Promise.all([action('id1', 300), action('id2', 200), action('id3', 100)]).then(() => {
      expect(saveRes).toEqual(['id3', 'id2', 'id1']);
      done();
    });
  });

  it('handles 4 calls to an asynchronous action (keep last)', (done) => {
    const ctx = getAsyncContext();

    const saveRes = [];
    const actions: StateDecoratorActions<S, A, P> = {
      setValue: {
        promise: ([value]) => {
          return getTimeoutPromise(100, value).then((res) => {
            saveRes.push(res);
            return res;
          });
        },
        reducer: (s, value) => ({ ...s, value }),
        conflictPolicy: ConflictPolicy.KEEP_LAST,
      },
    };

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.unmountedRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      {},
      ctx.addSideEffect
    );

    ctx.actionsRef.current.setValue = action;

    const p1 = action('id1');
    const p2 = action('id2');
    const p3 = action('id3');
    const p4 = action('id4').then(() => {
      expect(saveRes).toEqual(['id1', 'id4']);
      done();
    });
  });
});
