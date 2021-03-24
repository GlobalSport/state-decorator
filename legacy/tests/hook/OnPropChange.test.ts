import {
  handlePropChange,
  ReducerActionType,
  getInitialHookState,
  getUseReducer,
  ReducerAction,
} from '../../src/useStateDecorator';
import { StateDecoratorActions } from '../../src/types';
import { getSideEffectRef } from './testUtils';

describe('handlePropChange', () => {
  const getPropsRefValues = (p: { prop: string }) => [p.prop];
  const props = { prop: 'prop' };

  it('does nothing on first call', () => {
    const dispatch = jest.fn();
    const onPropsChangeReducer = jest.fn();
    const sideEffectRef = getSideEffectRef();
    const actionsRef = { current: {} };
    const oldPropRef = { current: null };

    handlePropChange(
      dispatch,
      props,
      { getPropsRefValues, onPropsChangeReducer },
      oldPropRef,
      sideEffectRef,
      actionsRef
    );

    expect(onPropsChangeReducer).not.toHaveBeenCalled();
  });
  it('calls onPropChangeReducer correctly', () => {
    const dispatch = jest.fn();
    const onPropsChangeReducer = jest.fn();
    const sideEffectRef = getSideEffectRef();
    const actionsRef = { current: {} };
    const oldPropRef = { current: { prop: 'old' } };

    handlePropChange(
      dispatch,
      props,
      { getPropsRefValues, onPropsChangeReducer },
      oldPropRef,
      sideEffectRef,
      actionsRef
    );

    // needs a re-render of the reducer to have correct state
    expect(sideEffectRef.current.list).toHaveLength(0);
    expect(sideEffectRef.current.delayed).toHaveLength(0);

    expect(dispatch).toHaveBeenCalledWith({
      props,
      type: ReducerActionType.ON_PROP_CHANGE_REDUCER,
      args: [0],
    });
  });

  it('calls onPropChange correctly', () => {
    const dispatch = jest.fn();
    const onPropsChange = jest.fn();
    const sideEffectRef = getSideEffectRef();
    const actionsRef = { current: { setValue: (s) => s } };
    const oldPropRef = { current: { prop: 'old' } };

    handlePropChange(dispatch, props, { getPropsRefValues, onPropsChange }, oldPropRef, sideEffectRef, actionsRef);

    // no need a re-render of the reducer to have correct state
    expect(sideEffectRef.current.list).toHaveLength(1);
    expect(sideEffectRef.current.delayed).toHaveLength(0);

    const s = { value: 'value' };
    return sideEffectRef.current.list[0](s).then(() => {
      expect(onPropsChange).toHaveBeenCalledWith(s, props, actionsRef.current, [0]);
    });
  });

  it('calls onPropChangeReducer & onPropChange correctly', () => {
    const dispatch = jest.fn();
    const onPropsChangeReducer = jest.fn();
    const onPropsChange = jest.fn();
    const sideEffectRef = getSideEffectRef();
    const oldPropRef = { current: { prop: 'old' } };

    const actionsRef = { current: { setValue: (s) => s } };

    handlePropChange(
      dispatch,
      props,
      { getPropsRefValues, onPropsChangeReducer, onPropsChange },
      oldPropRef,
      sideEffectRef,
      actionsRef
    );

    expect(dispatch).toHaveBeenCalledWith({
      props,
      type: ReducerActionType.ON_PROP_CHANGE_REDUCER,
      args: [0],
    });

    const s = { value: 'value' };

    // needs a re-render of the reducer to have correct state
    expect(sideEffectRef.current.list).toHaveLength(0);
    expect(sideEffectRef.current.delayed).toHaveLength(1);

    return sideEffectRef.current.delayed[0](s).then(() => {
      expect(onPropsChange).toHaveBeenCalledWith(s, props, actionsRef.current, [0]);
    });
  });
});

describe('onGetReducer', () => {
  it('handles onPropChangeReducer', () => {
    type S = { value: string };
    type A = {
      setValue: (v: string) => void;
    };
    type P = { prop: string };

    const actions: StateDecoratorActions<S, A, P> = {
      setValue: (s, [value], p) => ({ ...s, value: `${value}_${p.prop}` }),
    };

    const hookState = getInitialHookState((p: P) => ({ value: 'initial' }), actions, { prop: '' });
    const onPropsChangeReducer = (s: S, p: P) => ({ value: p.prop });

    const reducer = getUseReducer(actions, { onPropsChangeReducer });
    const reducerAction: ReducerAction<S, any, A, P> = {
      type: ReducerActionType.ON_PROP_CHANGE_REDUCER,
      args: [],
      props: { prop: 'prop' },
    };

    const newHookState = reducer(hookState, reducerAction);

    expect(newHookState.state).toEqual({ value: 'prop' });
  });
});
