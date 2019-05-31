import {
  handlePropChange,
  ReducerActionType,
  getInitialHookState,
  getUseReducer,
  ReducerAction,
} from '../../src/useStateDecorator/useStateDecorator';
import { StateDecoratorActions } from '../../src/types';

describe('handlePropChange', () => {
  const props = { prop: 'prop' };

  it('does nothing on first call', () => {
    const dispatch = jest.fn();
    const onPropsChangeReducer = jest.fn();
    const sideEffectRef = { current: [] };
    const actionsRef = { current: {} };

    handlePropChange(dispatch, false, props, { onPropsChangeReducer }, sideEffectRef, actionsRef);

    expect(onPropsChangeReducer).not.toHaveBeenCalled();
  });
  it('calls onPropChangeReducer correctly', () => {
    const dispatch = jest.fn();
    const onPropsChangeReducer = jest.fn();
    const sideEffectRef = { current: [] };
    const actionsRef = { current: {} };

    handlePropChange(dispatch, true, props, { onPropsChangeReducer }, sideEffectRef, actionsRef);

    expect(dispatch).toHaveBeenCalledWith({
      props,
      type: ReducerActionType.ON_PROP_CHANGE_REDUCER,
      args: [],
    });
  });

  it('calls onPropChange correctly', () => {
    const dispatch = jest.fn();
    const onPropsChange = jest.fn();
    const sideEffectRef = { current: [] };
    const actionsRef = { current: { setValue: (s) => s } };

    handlePropChange(dispatch, true, props, { onPropsChange }, sideEffectRef, actionsRef);

    const s = { value: 'value' };
    sideEffectRef.current[0](s);

    expect(onPropsChange).toHaveBeenCalledWith(s, props, actionsRef.current);
  });

  it('calls onPropChangeReducer & onPropChange correctly', () => {
    const dispatch = jest.fn();
    const onPropsChangeReducer = jest.fn();
    const onPropsChange = jest.fn();
    const sideEffectRef = { current: [] };
    const actionsRef = { current: { setValue: (s) => s } };

    handlePropChange(dispatch, true, props, { onPropsChangeReducer, onPropsChange }, sideEffectRef, actionsRef);

    expect(dispatch).toHaveBeenCalledWith({
      props,
      type: ReducerActionType.ON_PROP_CHANGE_REDUCER,
      args: [],
    });

    const s = { value: 'value' };
    sideEffectRef.current[0](s);

    expect(onPropsChange).toHaveBeenCalledWith(s, props, actionsRef.current);
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
    const reducerAction: ReducerAction<any, P> = {
      type: ReducerActionType.ON_PROP_CHANGE_REDUCER,
      args: [],
      props: { prop: 'prop' },
    };

    const newHookState = reducer(hookState, reducerAction);

    expect(newHookState.state).toEqual({ value: 'prop' });
  });
});
