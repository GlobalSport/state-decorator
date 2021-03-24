import { getInitialState, Filter, todoActions, TodoItem } from './Todos';

import { createMockStore } from '../../src/test';

describe('Todo', () => {
  const store = createMockStore(getInitialState, todoActions, {}, {}).setPartialState({
    idCount: 3,
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
  });

  it('onCreate', async () => {
    await store
      .setPartialState({
        newTitle: 'new todo',
      })
      .getAction('onCreate')
      .call()
      .then(({ state: { todoIds, todoMap } }) => {
        expect(todoIds).toEqual(['id', 'id2', 'id3']);
        expect(todoMap).toEqual({
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
          id3: {
            id: 'id3',
            completed: false,
            title: 'new todo',
          },
        });
      });
  });

  it('onEdit', async () => {
    await store
      .getAction('onEdit')
      .call('id2', 'itemEdited')
      .then(({ state: { todoIds, todoMap } }) => {
        expect(todoIds).toEqual(['id', 'id2']);
        expect(todoMap).toEqual({
          id: {
            id: 'id',
            completed: true,
            title: 'todo',
          },
          id2: {
            id: 'id2',
            completed: false,
            title: 'itemEdited',
          },
        });
      });
  });

  it('onDelete', async () => {
    await store
      .getAction('onDelete')
      .call('id')
      .then(({ state: { todoIds, todoMap } }) => {
        expect(todoIds).toEqual(['id2']);
        expect(todoMap).toEqual({
          id2: {
            id: 'id2',
            completed: false,
            title: 'todo 2',
          },
        });
      });
  });

  it('onToggle', async () => {
    const onToggle = store.getAction('onToggle');

    await onToggle.call('id2').then(({ state: { todoIds, todoMap } }) => {
      expect(todoIds).toEqual(['id', 'id2']);
      expect(todoMap).toEqual({
        id: {
          id: 'id',
          completed: true,
          title: 'todo',
        },
        id2: {
          id: 'id2',
          completed: true,
          title: 'todo 2',
        },
      });
    });

    await onToggle.call('id').then(({ state: { todoIds, todoMap } }) => {
      expect(todoIds).toEqual(['id', 'id2']);
      expect(todoMap).toEqual({
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
      });
    });
  });

  it('onClearCompleted', async () => {
    await store
      .getAction('onClearCompleted')
      .call()
      .then(({ state: { todoIds, todoMap } }) => {
        expect(todoIds).toEqual(['id2']);
        expect(todoMap).toEqual({
          id2: {
            id: 'id2',
            completed: false,
            title: 'todo 2',
          },
        });
      });
  });
});
