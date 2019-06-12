import { testSyncAction, testAsyncAction } from '../../../src';
import { actionsImpl, getInitialState } from '../../../examples/src/doc/Async';

describe('MyContainer', () => {
  describe('loadList', () => {
    it('reducer add list to state', () => {
      const initialState = getInitialState({});
      const list = [{ id: '1', value: 'item1' }, { id: '2', value: 'item2' }];

      return testAsyncAction(actionsImpl.loadList, (action) => {
        const newState = action.reducer(initialState, list, [], {});
        expect(newState.list).toBe(list);
      });
    });
  });

  describe('addItem', () => {
    it('reducer add item list correctly', () => {
      const list = [{ id: '1', value: 'item1' }, { id: '2', value: 'item2' }];
      const item = { id: '3', value: 'item3' };
      const initialState = { ...getInitialState({}), list };

      return testAsyncAction(actionsImpl.addItem, (action) => {
        const newState = action.optimisticReducer(initialState, [item], {});

        expect(newState.list).not.toBe(list);
        expect(newState.list).toHaveLength(3);
        expect(newState.list[0].id).toBe('1');
        expect(newState.list[1].id).toBe('2');
        expect(newState.list[2].id).toBe('3');
      });
    });
  });

  describe('removeItem', () => {
    it('reducer remove item from list correctly', () => {
      const list = [{ id: '1', value: 'item1' }, { id: '2', value: 'item2' }, { id: '3', value: 'item3' }];
      const initialState = { ...getInitialState({}), list };

      return testAsyncAction(actionsImpl.removeItem, (action) => {
        const newState = action.optimisticReducer(initialState, ['2'], {});

        expect(newState.list).not.toBe(list);
        expect(newState.list).toHaveLength(2);
        expect(newState.list[0].id).toBe('1');
        expect(newState.list[1].id).toBe('3');
      });
    });
  });
});
