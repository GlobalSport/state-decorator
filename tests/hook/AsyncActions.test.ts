import {
  ReducerActionType,
  addNewSideEffect,
  getUseReducer,
  getInitialHookState,
  ReducerAction,
  decorateAsyncAction,
  ReducerActionSubType,
  processSideEffects,
} from '../../src/useStateDecorator';
import { StateDecoratorActions } from '../../src/types';
import { getTimeoutPromise, getFailedTimeoutPromise, getAsyncContext } from './testUtils';

describe('decorateAsyncAction', () => {
  it('dispatches an async action correctly (success, no side effect)', () => {
    const ctx = getAsyncContext();

    const addSideEffect = jest.fn(addNewSideEffect);

    const actions = {
      setValue: {
        promise: () => getTimeoutPromise(0, 'result'),
        getSuccessMessage: (result) => `success message: ${result}`,
      },
    };

    const notifySuccess = jest.fn();

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      { notifySuccess },
      addSideEffect
    );

    expect(typeof action === 'function').toBeTruthy();

    const p = action('value').then(() => {
      expect(ctx.dispatch).toHaveBeenNthCalledWith(1, {
        actionName: 'setValue',
        args: ['value'],
        promiseId: null,
        props: ctx.propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.BEFORE_PROMISE,
      });

      expect(ctx.dispatch).toHaveBeenNthCalledWith(2, {
        actionName: 'setValue',
        args: ['value'],
        promiseId: null,
        props: ctx.propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.SUCCESS,
        result: 'result',
      });

      expect(addSideEffect).toHaveBeenCalledTimes(1); // sendRequest

      expect(notifySuccess).toHaveBeenCalledWith('success message: result');
    });

    processSideEffects(ctx.stateRef.current, ctx.dispatch, ctx.sideEffectRef);

    return p;
  });

  it('dispatches an async action correctly (success, with side effect)', () => {
    const ctx = getAsyncContext();
    const addSideEffect = jest.fn(addNewSideEffect);

    ctx.propsRef.current.notifySuccess = jest.fn();

    const actions = {
      setValue: {
        promise: () => getTimeoutPromise(100, 'result'),
        getSuccessMessage: (result) => `success message: ${result}`,
        onDone: jest.fn(),
      },
    };

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      {},
      addSideEffect
    );

    expect(typeof action === 'function').toBeTruthy();

    const p = action('value').then(() => {
      expect(ctx.dispatch).toHaveBeenNthCalledWith(1, {
        actionName: 'setValue',
        args: ['value'],
        promiseId: null,
        props: ctx.propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.BEFORE_PROMISE,
      });
      expect(ctx.dispatch).toHaveBeenNthCalledWith(2, {
        actionName: 'setValue',
        args: ['value'],
        promiseId: null,
        props: ctx.propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.SUCCESS,
        result: 'result',
      });

      const s = { value: 'value' };
      ctx.sideEffectRef.current[0](s);

      expect(actions.setValue.onDone).toHaveBeenCalledWith(
        s,
        'result',
        ['value'],
        ctx.propsRef.current,
        ctx.actionsRef.current
      );

      expect(ctx.propsRef.current.notifySuccess).toHaveBeenCalledWith('success message: result');
    });

    processSideEffects(ctx.stateRef.current, ctx.dispatch, ctx.sideEffectRef);
    return p;
  });

  it('dispatches an async action correctly (error)', (done) => {
    const ctx = getAsyncContext();

    const addSideEffect = jest.fn(addNewSideEffect);

    const actions = {
      setValue: {
        promise: () => getFailedTimeoutPromise(100, 'error'),
        onDone: jest.fn(),
        getErrorMessage: (error) => `error message: ${error}`,
      },
    };

    const options = {
      notifyError: jest.fn(),
    };

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      options,
      addSideEffect
    );

    expect(typeof action === 'function').toBeTruthy();

    const p = action('value').then(() => {
      expect(ctx.dispatch).toHaveBeenNthCalledWith(1, {
        actionName: 'setValue',
        args: ['value'],
        promiseId: null,
        props: ctx.propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.BEFORE_PROMISE,
      });
      expect(ctx.dispatch).toHaveBeenNthCalledWith(2, {
        actionName: 'setValue',
        args: ['value'],
        promiseId: null,
        props: ctx.propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.ERROR,
        rawActionsRef: { current: actions },
        error: 'error',
      });
      expect(options.notifyError).toHaveBeenCalledWith('error message: error');
      done();
    });

    processSideEffects(ctx.stateRef.current, ctx.dispatch, ctx.sideEffectRef);

    return p;
  });

  it('dispatches an async action correctly (error, notify from props)', (done) => {
    const ctx = getAsyncContext();

    const addSideEffect = jest.fn(addNewSideEffect);

    const actions = {
      setValue: {
        promise: () => getFailedTimeoutPromise(100, 'error'),
        onDone: jest.fn(),
        getErrorMessage: (error) => `error message: ${error}`,
      },
    };

    const options = {};

    ctx.propsRef.current.notifyError = jest.fn();

    const action = decorateAsyncAction(
      ctx.dispatch,
      'setValue',
      ctx.stateRef,
      ctx.propsRef,
      ctx.actionsRef,
      { current: actions },
      ctx.sideEffectRef,
      ctx.promisesRef,
      ctx.conflicActionsRef,
      options,
      addSideEffect
    );

    expect(typeof action === 'function').toBeTruthy();

    const p = action('value').then(() => {
      expect(ctx.propsRef.current.notifyError).toHaveBeenCalledWith('error message: error');
      done();
    });

    processSideEffects(ctx.stateRef.current, ctx.dispatch, ctx.sideEffectRef);

    return p;
  });
});

describe('getUseReducer', () => {
  describe('preReducer', () => {
    function preReducerTest(preReducer: any, result: string) {
      type S = { value: string };
      type A = {
        setValue: (v: string) => void;
      };
      type P = { prop: string };

      const actions: StateDecoratorActions<S, A, P> = {
        setValue: {
          preReducer,
          promise: () => getTimeoutPromise(0, 'result'),
        },
      };

      const hookState = getInitialHookState((p: P) => ({ value: 'initial' }), actions, { prop: '' });

      const reducer = getUseReducer(actions, {});

      const reducerAction: ReducerAction<S, any, A, P> = {
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.BEFORE_PROMISE,
        actionName: 'setValue',
        args: ['value'],
        props: { prop: 'prop' },
      };

      const newHookState = reducer(hookState, reducerAction);

      expect(newHookState.state).toEqual({ value: result });
    }

    it('handles correctly async action (before promise, preReducer)', () => {
      preReducerTest(
        (s, [value], p) => ({ ...s, value: `pre_${s.value}_${value}_${p.prop}` }),
        'pre_initial_value_prop'
      );
    });

    it('handles correctly async action (before promise, preReducer returns null)', () => {
      preReducerTest((s, [value], p) => null, 'initial');
    });

    it('handles correctly async action (before promise, no preReducer)', () => {
      preReducerTest(undefined, 'initial');
    });
  });

  describe('reducer', () => {
    function reducerSuccessTest(reducer: any, result: string) {
      type S = { value: string };
      type A = {
        setValue: (v: string) => void;
      };
      type P = { prop: string };

      const actions: StateDecoratorActions<S, A, P> = {
        setValue: {
          reducer,
          promise: () => getTimeoutPromise(0, 'result'),
        },
      };

      const hookState = getInitialHookState((p: P) => ({ value: 'initial' }), actions, { prop: '' });

      const reducerFunc = getUseReducer(actions, {});

      const reducerAction: ReducerAction<S, any, A, P> = {
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.SUCCESS,
        actionName: 'setValue',
        args: ['value'],
        result: 'result',
        props: { prop: 'prop' },
      };

      const newHookState = reducerFunc(hookState, reducerAction);

      expect(newHookState.state).toEqual({ value: result });
      expect(newHookState.loadingMap.setValue).toBeFalsy();
    }

    it('handles correctly async action (success, reducer)', () => {
      reducerSuccessTest(
        (s, result, [value], p) => ({ ...s, value: `${s.value}_${value}_${result}_${p.prop}` }),
        'initial_value_result_prop'
      );
    });

    it('handles correctly async action (success, reducer returns null)', () => {
      reducerSuccessTest(() => null, 'initial');
    });

    it('handles correctly async action (success, no reducer)', () => {
      reducerSuccessTest(undefined, 'initial');
    });
  });

  describe('errorReducer', () => {
    function reducerErrorTest(errorReducer: any, result: string) {
      type S = { value: string };
      type A = {
        setValue: (v: string) => void;
      };
      type P = { prop: string };

      const actions: StateDecoratorActions<S, A, P> = {
        setValue: {
          errorReducer,
          promise: () => getFailedTimeoutPromise(0, 'error'),
        },
      };

      const hookState = getInitialHookState((p: P) => ({ value: 'initial' }), actions, { prop: '' });

      const reducerFunc = getUseReducer(actions, {});

      const reducerAction: ReducerAction<S, any, A, P> = {
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.ERROR,
        actionName: 'setValue',
        args: ['value'],
        error: 'error',
        props: { prop: 'prop' },
      };

      const newHookState = reducerFunc(hookState, reducerAction);

      expect(newHookState.state).toEqual({ value: result });
    }

    it('handles correctly async action (error, reducer)', () => {
      reducerErrorTest(
        (s, error, [value], p) => ({ ...s, value: `${s.value}_${value}_${error}_${p.prop}` }),
        'initial_value_error_prop'
      );
    });

    it('handles correctly async action (error, reducer returns null)', () => {
      reducerErrorTest(() => null, 'initial');
    });

    it('handles correctly async action (error, no reducer)', () => {
      reducerErrorTest(undefined, 'initial');
    });
  });
});
