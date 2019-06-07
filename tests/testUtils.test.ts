import { StateDecoratorActions } from '../src/StateDecorator';
import { testSyncAction, testAsyncAction, testAdvancedSyncAction, computeAsyncActionInput } from '../src/base';
import { ConflictPolicy } from '../src/types';

describe('Testing utilities', () => {
  type State = {
    value: number;
  };
  type Actions = {
    increment: (v: number) => void;
    incrAsync: (v: number) => Promise<number>;
    incrComplexSync: (v: number) => Promise<number>;
    incrAsyncGet: (v: number) => Promise<number>;
  };
  type Props = {};

  const actions: StateDecoratorActions<State, Actions, Props> = {
    increment: (s, [incr], props) => {
      return {
        value: s.value + incr,
      };
    },
    incrComplexSync: {
      action: (s, [incr], props) => ({
        value: s.value + incr,
      }),
    },
    incrAsync: {
      promise: ([incr]) => Promise.resolve(incr),
      reducer: (s, incr) => ({ value: s.value + incr }),
    },
    incrAsyncGet: {
      promiseGet: ([incr]) => Promise.resolve(incr),
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

  it('testSyncAction (incorrect type 2)', (done) => {
    const testFunc = jest.fn();

    testSyncAction(actions.incrComplexSync, testFunc).catch((e) => {
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

  it('testAsyncAction (promiseGet converted in promise)', (done) => {
    const p = testAsyncAction(actions.incrAsyncGet, (action) => {
      expect(action).toBeDefined();
      expect(action.promise).toBeDefined();
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

  it('testAsyncAction (incorrect type2)', (done) => {
    const testFunc = jest.fn();

    testAsyncAction(actions.incrComplexSync, testFunc).catch((e) => {
      expect(testFunc).not.toHaveBeenCalled();
      done();
    });
  });

  it('testSyncComplexAction (promiseGet converted in promise)', (done) => {
    const p = testAdvancedSyncAction(actions.incrComplexSync, (action) => {
      expect(action).toBeDefined();
      expect(action.action).toBeDefined();
      done();
    });
    p && p.catch((e) => done.fail(e));
  });

  it('testSyncComplexAction (incorrect type)', (done) => {
    const testFunc = jest.fn();

    testAdvancedSyncAction(actions.increment, testFunc).catch((e) => {
      expect(testFunc).not.toHaveBeenCalled();
      done();
    });
  });

  it('testSyncComplexAction (incorrect type2)', (done) => {
    const testFunc = jest.fn();

    testAdvancedSyncAction(actions.incrAsync, testFunc).catch((e) => {
      expect(testFunc).not.toHaveBeenCalled();
      done();
    });
  });

  it('computeAsyncAction', () => {
    const action = {
      promiseGet: () => Promise.resolve(),
    };

    const newAction = computeAsyncActionInput(action);

    expect(newAction.promise).toBeDefined();
    expect(newAction.retryCount).toEqual(3);
    expect(newAction.conflictPolicy).toEqual(ConflictPolicy.REUSE);
  });
});
