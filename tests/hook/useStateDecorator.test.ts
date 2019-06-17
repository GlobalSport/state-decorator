import { getTimeoutPromise } from './testUtils';
import { StateDecoratorActions } from '../../src';
import { getInitialHookState } from '../../src/useStateDecorator';

describe('getInitialHookState', () => {
  type S = {
    value: string;
  };

  type A = {
    setValue: (value: string) => Promise<string>;
    setValue2: (value: string) => Promise<string>;
    setValue3: (value: string) => Promise<string>;
    setValue4: (value: string) => Promise<string>;
    setValue5: (value: string) => Promise<string>;
  };

  type P = {
    prop: string;
  };

  const actions: StateDecoratorActions<S, A, P> = {
    setValue: { promise: ([v]) => getTimeoutPromise(0, v) },
    setValue2: { promise: ([v]) => getTimeoutPromise(0, v) },
    setValue3: { promise: ([v]) => getTimeoutPromise(0, v) },
    setValue4: { promise: ([v]) => getTimeoutPromise(0, v) },
    setValue5: { promise: ([v]) => getTimeoutPromise(0, v) },
  };

  it('create hook state correctly (simple)', () => {
    const getInitialState = (p: P): S => ({
      value: p.prop,
    });

    const hookState = getInitialHookState(getInitialState, actions, { prop: 'propValue' }, ['setValue2', 'setValue4']);

    expect(hookState.state).toEqual({ value: 'propValue' });
    expect(hookState.loadingMap).toEqual({
      setValue: undefined,
      setValue2: true,
      setValue3: undefined,
      setValue4: true,
      setValue5: undefined,
    });
    expect(hookState.optimisticData).toEqual({
      shouldRecordHistory: false,
      optimisticActions: {},
      history: [],
    });
  });
});
