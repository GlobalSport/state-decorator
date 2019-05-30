import {
  decorateSyncAction,
  ReducerActionType,
  decorateAdvancedSyncAction,
  addNewSideEffect,
  getUseReducer,
  getInitialHookState,
  ReducerAction,
} from '../../src/useStateDecorator/useStateDecorator';
import { StateDecoratorActions } from '../../src/types';

describe('decorateSyncAction', () => {
  it('dispatches a simple sync action correctly', () => {
    const dispatch = jest.fn();
    const propsRef = {
      current: {
        prop: 'value',
      },
    };

    const action = decorateSyncAction(dispatch, 'actionName', (s) => s, propsRef);

    expect(typeof action === 'function').toBeTruthy();

    action('value');

    expect(dispatch).toHaveBeenCalledWith({
      actionName: 'actionName',
      args: ['value'],
      props: propsRef.current,
      type: ReducerActionType.ACTION,
    });
  });
});

describe('decorateAdvancedSyncAction', () => {
  it('dispatches an advanced sync action correctly', () => {
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

    const addSideEffect = jest.fn(addNewSideEffect);

    const actionImpl = {
      action: (s) => s,
    };

    const action = decorateAdvancedSyncAction(
      dispatch,
      'actionName',
      actionImpl,
      propsRef,
      actionsRef,
      sideEffectRef,
      {},
      addSideEffect
    );

    expect(typeof action === 'function').toBeTruthy();

    action('value');

    expect(dispatch).toHaveBeenCalledWith({
      actionName: 'actionName',
      args: ['value'],
      props: propsRef.current,
      type: ReducerActionType.ACTION,
    });

    expect(addSideEffect).not.toHaveBeenCalled();
  });

  it('dispatches an advanced sync action correctly (with side effet)', () => {
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

    const addSideEffect = jest.fn(addNewSideEffect);

    const actionImpl = {
      action: (s) => s,
      onActionDone: jest.fn((s, [], p, actions) => {
        actions.action();
      }),
    };

    const action = decorateAdvancedSyncAction(
      dispatch,
      'actionName',
      actionImpl,
      propsRef,
      actionsRef,
      sideEffectRef,
      {},
      addSideEffect
    );

    expect(typeof action === 'function').toBeTruthy();

    action('value');

    expect(dispatch).toHaveBeenCalledWith({
      actionName: 'actionName',
      args: ['value'],
      props: propsRef.current,
      type: ReducerActionType.ACTION,
    });

    expect(addSideEffect).toHaveBeenCalled();

    const s = { value: 'value' };
    sideEffectRef.current[0](s);

    expect(actionImpl.onActionDone).toHaveBeenCalledWith(s, ['value'], propsRef.current, actionsRef.current);
  });
});

describe('getUseReducer', () => {
  it('handles correctly simple sync action', () => {
    type S = { value: string };
    type A = {
      setValue: (v: string) => void;
    };
    type P = { prop: string };

    const actions: StateDecoratorActions<S, A, P> = {
      setValue: (s, [value], p) => ({ ...s, value: `${value}_${p.prop}` }),
    };

    const hookState = getInitialHookState((p: P) => ({ value: 'initial' }), actions, { prop: '' });

    const reducer = getUseReducer(actions, {});
    const reducerAction: ReducerAction<any, P> = {
      type: ReducerActionType.ACTION,
      actionName: 'setValue',
      args: ['value'],
      props: { prop: 'prop' },
    };

    const newHookState = reducer(hookState, reducerAction);

    expect(newHookState.state).toEqual({ value: 'value_prop' });
  });

  it('handles correctly advanced sync action', () => {
    type S = { value: string };
    type A = {
      setValue: (v: string) => void;
    };
    type P = { prop: string };

    const actions: StateDecoratorActions<S, A, P> = {
      setValue: {
        action: (s, [value], p) => ({ ...s, value: `${value}_${p.prop}` }),
      },
    };

    const hookState = getInitialHookState((p: P) => ({ value: 'initial' }), actions, { prop: '' });
    const reducer = getUseReducer(actions, {});
    const reducerAction: ReducerAction<any, P> = {
      type: ReducerActionType.ACTION,
      actionName: 'setValue',
      args: ['value'],
      props: { prop: 'prop' },
    };

    const newHookState = reducer(hookState, reducerAction);

    expect(newHookState.state).toEqual({ value: 'value_prop' });
  });
});
