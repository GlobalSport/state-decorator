import TodoContainer, { getInitialState, Filter } from '../../src/todo/Todos';
import { testSyncAction } from '../../../src/StateDecorator';

describe('Todo', () => {
  it('onCreate', () => {
    const state = {
      ...getInitialState(),
      newTitle: 'new todo',
    };

    return testSyncAction(TodoContainer.actions.onCreate, (action) => {
      const newState = action(state, null, null);
      expect(newState).not.toBe(state);
      expect(newState.todoIds).toHaveLength(1);
      expect(newState.todoMap[newState.todoIds[0]].completed).toBeFalsy();
      expect(newState.todoMap[newState.todoIds[0]].title).toEqual('new todo');
    });
  });

  it('onEdit', () => {
    const state = {
      ...getInitialState(),
      todoIds: ['id'],
      todoMap: {
        id: {
          id: 'id',
          completed: false,
          title: 'old todo',
        },
      },
    };

    return testSyncAction(TodoContainer.actions.onEdit, (action) => {
      const newState = action(state, ['id', 'new todo'], null);
      expect(newState).not.toBe(state);
      expect(newState.todoIds).toHaveLength(1);
      expect(newState.todoMap[newState.todoIds[0]].completed).toBeFalsy();
      expect(state.todoMap[newState.todoIds[0]].title).toEqual('old todo');
      expect(newState.todoMap[newState.todoIds[0]].title).toEqual('new todo');
    });
  });

  it('onDelete', () => {
    const state = {
      ...getInitialState(),
      todoIds: ['id', 'id2'],
      todoMap: {
        id: {
          id: 'id',
          completed: false,
          title: 'todo',
        },
        id2: {
          id: 'id2',
          completed: false,
          title: 'todo 2',
        },
      },
    };

    return testSyncAction(TodoContainer.actions.onDelete, (action) => {
      const newState = action(state, ['id'], null);
      expect(newState).not.toBe(state);
      expect(state.todoIds).toHaveLength(2);
      expect(newState.todoIds).toHaveLength(1);
      expect(newState.todoMap[newState.todoIds[0]].completed).toBeFalsy();
      expect(newState.todoMap[newState.todoIds[0]].title).toEqual('todo 2');
    });
  });

  it('onToggle', () => {
    const state = {
      ...getInitialState(),
      todoIds: ['id'],
      todoMap: {
        id: {
          id: 'id',
          completed: true,
          title: 'todo',
        },
      },
    };

    return testSyncAction(TodoContainer.actions.onToggle, (action) => {
      const newState = action(state, ['id'], null);
      expect(newState).not.toBe(state);
      expect(state.todoMap[state.todoIds[0]].completed).toBeTruthy();
      expect(newState.todoMap[newState.todoIds[0]].completed).toBeFalsy();

      const newState2 = action(newState, ['id'], null);
      expect(newState2.todoMap[newState2.todoIds[0]].completed).toBeTruthy();
    });
  });

  it('onClearCompleted', () => {
    const state = {
      ...getInitialState(),
      todoIds: ['id', 'id2'],
      todoMap: {
        id: {
          id: 'id',
          completed: true,
          title: 'todo',
        },
        id2: {
          id: 'id2',
          completed: false,
          title: 'todo 2',
        },
      },
    };

    return testSyncAction(TodoContainer.actions.onClearCompleted, (action) => {
      const newState = action(state, null, null);
      expect(newState).not.toBe(state);
      expect(state.todoIds).toHaveLength(2);
      expect(newState.todoIds).toHaveLength(1);
      expect(newState.todoMap[newState.todoIds[0]].completed).toBeFalsy();
      expect(newState.todoMap[newState.todoIds[0]].title).toEqual('todo 2');
    });
  });

  it('onSetNewTitle', () => {
    const state = {
      ...getInitialState(),
      newTitle: 'title',
    };

    return testSyncAction(TodoContainer.actions.onSetNewTitle, (action) => {
      const newState = action(state, ['new title'], null);
      expect(newState).not.toBe(state);
      expect(state.newTitle).toEqual('title');
      expect(newState.newTitle).toEqual('new title');
    });
  });

  it('onSetFilter', () => {
    const state = {
      ...getInitialState(),
      filter: Filter.ALL,
    };

    const onSetFilter = TodoContainer.actions.onSetFilter;
    return testSyncAction(TodoContainer.actions.onSetFilter, (action) => {
      const newState = action(state, [Filter.COMPLETED], null);
      expect(newState).not.toBe(state);
      expect(state.filter).toEqual(Filter.ALL);
      expect(newState.filter).toEqual(Filter.COMPLETED);
      const newState2 = action(state, [Filter.NON_COMPLETED], null);
      expect(newState2.filter).toEqual(Filter.NON_COMPLETED);
    });
  });
});
