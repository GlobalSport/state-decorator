import {
  ReducerActionType,
  addNewSideEffect,
  getUseReducer,
  getInitialHookState,
  ReducerAction,
  decorateAsyncAction,
  ReducerActionSubType,
} from '../../src/useStateDecorator/useStateDecorator';
import { StateDecoratorActions } from '../../src/types';
import { getTimeoutPromise, getFailedTimeoutPromise } from './testUtils';

describe('decorateAsyncAction', () => {
  it('dispatches an async action correctly (success, no side effect)', () => {
    const dispatch = jest.fn();
    const propsRef = {
      current: {
        prop: 'value',
      },
    };

    const actionsRef = {
      current: { action: jest.fn() },
    };

    const sideEffectRef = {
      current: [],
    };

    const stateRef = {
      current: 'initial',
    };

    const addSideEffect = jest.fn(addNewSideEffect);

    const actionImpl = {
      promise: () => getTimeoutPromise(0, 'result'),
    };

    const action = decorateAsyncAction(
      dispatch,
      'actionName',
      actionImpl,
      stateRef,
      propsRef,
      actionsRef,
      sideEffectRef,
      {},
      addSideEffect
    );

    expect(typeof action === 'function').toBeTruthy();

    return action('value').then(() => {
      expect(dispatch).toHaveBeenNthCalledWith(1, {
        actionName: 'actionName',
        args: ['value'],
        props: propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.BEFORE_PROMISE,
      });

      expect(dispatch).toHaveBeenNthCalledWith(2, {
        actionName: 'actionName',
        args: ['value'],
        props: propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.SUCCESS,
        result: 'result',
      });

      expect(addSideEffect).not.toHaveBeenCalled();
    });
  });

  it('dispatches an async action correctly (success, with side effect)', () => {
    const dispatch = jest.fn();
    const propsRef = {
      current: {
        prop: 'value',
      },
    };

    const actionsRef = {
      current: { action: jest.fn() },
    };

    const sideEffectRef = {
      current: [],
    };

    const stateRef = {
      current: 'initial',
    };

    const addSideEffect = jest.fn(addNewSideEffect);

    const actionImpl = {
      promise: () => getTimeoutPromise(100, 'result'),
      onDone: jest.fn(),
    };

    const action = decorateAsyncAction(
      dispatch,
      'actionName',
      actionImpl,
      stateRef,
      propsRef,
      actionsRef,
      sideEffectRef,
      {},
      addSideEffect
    );

    expect(typeof action === 'function').toBeTruthy();

    return action('value').then(() => {
      expect(dispatch).toHaveBeenNthCalledWith(1, {
        actionName: 'actionName',
        args: ['value'],
        props: propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.BEFORE_PROMISE,
      });
      expect(dispatch).toHaveBeenNthCalledWith(2, {
        actionName: 'actionName',
        args: ['value'],
        props: propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.SUCCESS,
        result: 'result',
      });

      const s = { value: 'value' };
      sideEffectRef.current[0](s);

      expect(actionImpl.onDone).toHaveBeenCalledWith(s, 'result', ['value'], propsRef.current, actionsRef.current);
    });
  });

  it('dispatches an async action correctly (error)', () => {
    const dispatch = jest.fn();
    const propsRef = {
      current: {
        prop: 'value',
      },
    };

    const actionsRef = {
      current: { action: jest.fn() },
    };

    const sideEffectRef = {
      current: [],
    };

    const stateRef = {
      current: 'initial',
    };

    const addSideEffect = jest.fn(addNewSideEffect);

    const actionImpl = {
      promise: () => getFailedTimeoutPromise(100, 'error'),
      onDone: jest.fn(),
    };

    const action = decorateAsyncAction(
      dispatch,
      'actionName',
      actionImpl,
      stateRef,
      propsRef,
      actionsRef,
      sideEffectRef,
      {},
      addSideEffect
    );

    expect(typeof action === 'function').toBeTruthy();

    return action('value').then(() => {
      expect(dispatch).toHaveBeenNthCalledWith(1, {
        actionName: 'actionName',
        args: ['value'],
        props: propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.BEFORE_PROMISE,
      });
      expect(dispatch).toHaveBeenNthCalledWith(2, {
        actionName: 'actionName',
        args: ['value'],
        props: propsRef.current,
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.ERROR,
        error: 'error',
      });
    });
  });
});

describe('getUseReducer', () => {
  function preReducerTest(preReducer, result) {
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

    const reducerAction: ReducerAction<any, P> = {
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
    preReducerTest((s, [value], p) => ({ ...s, value: `pre_${value}_${p.prop}` }), 'pre_value_prop');
  });

  it('handles correctly async action (before promise, preReducer returns null)', () => {
    preReducerTest((s, [value], p) => null, 'initial');
  });

  it('handles correctly async action (before promise, no preReducer)', () => {
    preReducerTest(undefined, 'initial');
  });
});
