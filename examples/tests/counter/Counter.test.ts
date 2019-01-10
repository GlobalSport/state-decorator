import { isSyncAction } from '../../../src/StateDecorator';
import CounterContainer, { initialState } from '../../src/counter/Counter';

describe('Counter', () => {
  it('has a correct default state', () => {
    expect(initialState).toBe(0);
  });

  it('increments correctly', () => {
    const { increment } = CounterContainer.actions;
    if (isSyncAction(increment)) {
      expect(increment(0, null, null)).toEqual(1);
    }
  });

  it('decrements correctly', () => {
    const { decrement } = CounterContainer.actions;
    if (isSyncAction(decrement)) {
      expect(decrement(10, null, null)).toEqual(9);
    }
  });
});
