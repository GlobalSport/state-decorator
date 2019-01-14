import { isSyncAction, testSyncAction } from '../../../src/StateDecorator';
import CounterContainer, { initialState } from '../../src/counter/Counter';

describe('Counter', () => {
  it('has a correct default state', () => {
    expect(initialState).toBe(0);
  });

  it('increments correctly', () => {
    return testSyncAction(CounterContainer.actions.increment, (action) => {
      expect(action(10, [10], null)).toEqual(20);
    });
  });

  it('decrements correctly', () => {
    return testSyncAction(CounterContainer.actions.decrement, (action) => {
      expect(action(10, [2], null)).toEqual(8);
    });
  });
});
