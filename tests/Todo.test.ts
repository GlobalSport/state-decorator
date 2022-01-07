import { createMockFromStore } from '../src/test';

import todoStore from './fixtures/TodoStore';

describe('Todo', () => {
  // create a mock store and setup initial state
  // this store can be shared accross tests because it is immutable
  const store = createMockFromStore(todoStore)
    // or
    //   const store = createMockStore(getInitialState, actions, props, options)
    // initial state / props can be set in full form or partial form
    .setPartialState({
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

  it('onSetNewTitle', async () => {
    // always return a promise whatever if the action is asynchronous or not
    const { state, prevState } = await store.getAction('onSetNewTitle').call('new Title');

    // previous state is available for comparison
    expect(prevState.newTitle).toEqual('');
    expect(state.newTitle).toEqual('new Title');
  });

  it('onCreate', async () => {
    const {
      state: { todoIds, todoMap, todos },
    } = await store
      // set partial state and return new store, source store is untouched
      .setPartialState({
        newTitle: 'new todo',
      })
      // get a mock action that can be shared too !
      .getAction('onCreate')
      // Invokes action. It has no side effect on state of mock action
      .call();

    // assert state
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

    // assert derived state
    //
    // export const todoOptions: StoreOptions<State, Actions, Props, DerivedState> = {
    //     derivedState: {
    //       todos: {
    //         getDeps: ({ s }) => [s.todoIds, s.todoMap],
    //         get: ({ s }) => s.todoIds.map((id) => s.todoMap[id]),
    //       },
    //     },
    //   };

    expect(todos).toEqual([
      {
        id: 'id',
        completed: true,
        title: 'todo',
      },
      {
        id: 'id2',
        completed: false,
        title: 'todo 2',
      },
      {
        id: 'id3',
        completed: false,
        title: 'new todo',
      },
    ]);
  });

  describe('onToggle', () => {
    // this mock action is shared in two tests but they can run in parallel
    const onToggle = store.getAction('onToggle');

    it('toggle false => true', async () => {
      // arguments of call() depend on the Store action signature, use auto completion!
      const {
        state: { todoIds, todoMap },
        actions,
      } = await onToggle.call('id2');

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

      // if there are some side effects calling store actions, you can test them
      // as mock actions are injected instead of real actions.
      expect(actions.updateRemoteList).toHaveBeenCalled();
    });

    it('toggle true => false', async () => {
      const {
        state: { todoIds, todoMap },
        actions,
      } = await onToggle.call('id');

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

      // if there are some side effects calling store actions, you can test them
      // as mock actions are injected instead of real actions.
      expect(actions.updateRemoteList).toHaveBeenCalled();
    });
  });

  // Another store / action
  describe('loadRemoteList', () => {
    // action is shared
    const action = store.getAction('loadRemoteList');

    it('success', async () => {
      const { state } = await action
        // override default promise result
        .promiseResolves([
          {
            id: 'item1',
            title: 'item title',
            completed: true,
          },
        ])
        .call();

      expect(state.error).toBeFalsy();
      expect(state.todoIds).toEqual(['item1']);
      expect(state.todoMap).toEqual({
        item1: {
          id: 'item1',
          title: 'item title',
          completed: true,
        },
      });
    });

    it('error', async () => {
      const { state } = await action
        // override default promise result with error
        .promiseRejects(new Error('boom'))
        .call();

      expect(state.error).toBeTruthy();
    });
  });

  // Test effects and side effect when props are changing
  //
  // Here:
  //   export const todoOptions: StoreOptions<State, Actions, Props, DerivedState> = {
  //     onPropsChange: [
  //       {
  //         getDeps: (p) => [p.initialTodos],
  //         effects: ({ s, p }) => ({ ...s, ...splitList(p.initialTodos) }),
  //         onMount: true,
  //       },
  //     ],
  //   };
  it('onPropsChange', () => {
    store
      // onPropsChange allows to test prop change, no side effect on original store
      // to create a new store with new props, use setProps or setPartialProps
      .onPropsChange({
        initialTodos: [
          {
            id: 'item1',
            title: 'Item 1',
            completed: false,
          },
        ],
      })
      .test(({ state, actions }) => {
        // test state after prop has changed
        expect(state.todoIds).toEqual(['item1']);
        expect(state.todoMap).toEqual({
          item1: {
            id: 'item1',
            title: 'Item 1',
            completed: false,
          },
        });

        // test derived state after prop has changed
        expect(state.todos).toEqual([
          {
            id: 'item1',
            title: 'Item 1',
            completed: false,
          },
        ]);

        // test side effects also
        expect(actions.loadRemoteList).not.toHaveBeenCalled();
      });
  });

  describe('Initialization', () => {
    it('initial todos => setup state and do not load list', () => {
      store
        .setPartialState({
          todoIds: [],
          todoMap: {},
        })
        .init({
          initialTodos: [
            {
              id: 'item1',
              title: 'Item 1',
              completed: false,
            },
          ],
        })
        .test(({ state, actions }) => {
          // test state after initialization, ie:
          // - options.onPropsChange with onMount: true
          // - options.onMount
          expect(state.todoIds).toEqual(['item1']);
          expect(state.todoMap).toEqual({
            item1: {
              id: 'item1',
              title: 'Item 1',
              completed: false,
            },
          });

          // test derived state
          expect(state.todos).toEqual([
            {
              id: 'item1',
              title: 'Item 1',
              completed: false,
            },
          ]);

          // test side effects also
          expect(actions.loadRemoteList).not.toHaveBeenCalled();
        });
    });
  });

  it('if not initial todo => load list', () => {
    store
      .setPartialState({
        todoIds: [],
        todoMap: {},
      })
      .init({ initialTodos: null })
      .test(({ state, actions }) => {
        // test state after initialization, ie:
        // - options.onPropsChange with onMount: true
        // - options.onMount
        expect(state.todoIds).toEqual([]);
        expect(state.todoMap).toEqual({});

        // test derived state
        expect(state.todos).toEqual([]);

        // test side effects also
        expect(actions.loadRemoteList).toHaveBeenCalled();
      });
  });
});
