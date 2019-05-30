import { testSyncAction } from '../../../src/base';
import { getInitialState, actions } from '../../src/counter/Counter';

describe('Counter', () => {
  it('has a correct default state', () => {
    expect(getInitialState()).toEqual({ counter: 0 });
  });

  it('increments correctly', () => {
    return testSyncAction(actions.increment, (action) => {
      const state = { counter: 10 };
      let newState = action(state, [10], null);
      expect(newState.counter).toEqual(20);
      newState = action(newState, [5], null);
      expect(newState.counter).toEqual(25);
    });
  });

  it('decrements correctly', () => {
    return testSyncAction(actions.decrement, (action) => {
      const state = { counter: 30 };
      let newState = action(state, [10], null);
      expect(newState.counter).toEqual(20);
      newState = action(newState, [5], null);
      expect(newState.counter).toEqual(15);
    });
  });
});
