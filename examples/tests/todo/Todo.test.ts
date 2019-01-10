import TodoContainer, { getInitialState, Filter } from '../../src/todo/Todos';
import { isSyncAction } from '../../../src/StateDecorator';

describe('Todo', () => {
  it('onCreate', () => {
    const state = {
      ...getInitialState(),
      newTitle: 'new todo',
    };

    const onCreate = TodoContainer.actions.onCreate;
    if (isSyncAction(onCreate)) {
      const newState = onCreate(state, null, null);
      expect(newState).not.toBe(state);
      expect(newState.todoIds).toHaveLength(1);
      expect(newState.todoMap[newState.todoIds[0]].completed).toBeFalsy();
      expect(newState.todoMap[newState.todoIds[0]].title).toEqual('new todo');
    }
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

    const onEdit = TodoContainer.actions.onEdit;
    if (isSyncAction(onEdit)) {
      const newState = onEdit(state, ['id', 'new todo'], null);
      expect(newState).not.toBe(state);
      expect(newState.todoIds).toHaveLength(1);
      expect(newState.todoMap[newState.todoIds[0]].completed).toBeFalsy();
      expect(state.todoMap[newState.todoIds[0]].title).toEqual('old todo');
      expect(newState.todoMap[newState.todoIds[0]].title).toEqual('new todo');
    }
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

    const onDelete = TodoContainer.actions.onDelete;
    if (isSyncAction(onDelete)) {
      const newState = onDelete(state, ['id'], null);
      expect(newState).not.toBe(state);
      expect(state.todoIds).toHaveLength(2);
      expect(newState.todoIds).toHaveLength(1);
      expect(newState.todoMap[newState.todoIds[0]].completed).toBeFalsy();
      expect(newState.todoMap[newState.todoIds[0]].title).toEqual('todo 2');
    }
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

    const onToggle = TodoContainer.actions.onToggle;
    if (isSyncAction(onToggle)) {
      const newState = onToggle(state, ['id'], null);
      expect(newState).not.toBe(state);
      expect(state.todoMap[state.todoIds[0]].completed).toBeTruthy();
      expect(newState.todoMap[newState.todoIds[0]].completed).toBeFalsy();

      const newState2 = onToggle(newState, ['id'], null);
      expect(newState2.todoMap[newState2.todoIds[0]].completed).toBeTruthy();
    }
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

    const onClearCompleted = TodoContainer.actions.onClearCompleted;
    if (isSyncAction(onClearCompleted)) {
      const newState = onClearCompleted(state, null, null);
      expect(newState).not.toBe(state);
      expect(state.todoIds).toHaveLength(2);
      expect(newState.todoIds).toHaveLength(1);
      expect(newState.todoMap[newState.todoIds[0]].completed).toBeFalsy();
      expect(newState.todoMap[newState.todoIds[0]].title).toEqual('todo 2');
    }
  });

  it('onSetNewTitle', () => {
    const state = {
      ...getInitialState(),
      newTitle: 'title',
    };

    const onSetNewTitle = TodoContainer.actions.onSetNewTitle;
    if (isSyncAction(onSetNewTitle)) {
      const newState = onSetNewTitle(state, ['new title'], null);
      expect(newState).not.toBe(state);
      expect(state.newTitle).toEqual('title');
      expect(newState.newTitle).toEqual('new title');
    }
  });

  it('onSetFilter', () => {
    const state = {
      ...getInitialState(),
      filter: Filter.ALL,
    };

    const onSetFilter = TodoContainer.actions.onSetFilter;
    if (isSyncAction(onSetFilter)) {
      const newState = onSetFilter(state, [Filter.COMPLETED], null);
      expect(newState).not.toBe(state);
      expect(state.filter).toEqual(Filter.ALL);
      expect(newState.filter).toEqual(Filter.COMPLETED);
      const newState2 = onSetFilter(state, [Filter.NON_COMPLETED], null);
      expect(newState2.filter).toEqual(Filter.NON_COMPLETED);
    }
  });
});
