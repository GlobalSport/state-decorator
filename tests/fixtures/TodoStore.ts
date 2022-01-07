import { createStore, StoreActions, StoreOptions } from '../../src/index';

// Types

export enum Filter {
  ALL = 'all',
  COMPLETED = 'completed',
  NON_COMPLETED = 'non_completed',
}

export type TodoItem = {
  id: string;
  title: string;
  completed: boolean;
};

export type State = {
  error: boolean;
  newTitle: string;
  todoMap: { [id: string]: TodoItem };
  todoIds: string[];
  idCount: number;
  filter: Filter;
};

export type DerivedState = {
  todos: TodoItem[];
};

export type Props = {
  initialTodos: TodoItem[];
};

export type Actions = {
  loadRemoteList: () => Promise<TodoItem[]>;
  updateRemoteList: () => Promise<void>;
  onSetNewTitle: (title: string) => void;
  onCreate: () => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onClearCompleted: () => void;
  onSetFilter: (filter: Filter) => void;
};

// Initial state
export const getInitialState = (): State => ({
  error: false,
  newTitle: '',
  todoMap: {
    first: {
      id: 'first',
      title: 'Initial todo',
      completed: false,
    },
  },
  todoIds: ['first'],
  idCount: 0,
  filter: Filter.ALL,
});

const splitList = (items: TodoItem[]) => ({
  todoIds: items.map((i) => i.id),
  todoMap: items.reduce<State['todoMap']>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {}),
});

// Actions implementation

export const todoActions: StoreActions<State, Actions> = {
  onSetNewTitle: ({ s, args: [newTitle] }) => ({ ...s, newTitle }),
  onCreate: {
    effects: ({ s }) => {
      const newTodo: TodoItem = {
        title: s.newTitle,
        id: `id${s.idCount}`,
        completed: false,
      };

      return {
        ...s,
        idCount: s.idCount + 1,
        todoMap: {
          ...s.todoMap,
          [newTodo.id]: newTodo,
        },
        todoIds: [...s.todoIds, newTodo.id],
      };
    },
    sideEffects: ({ a }) => {
      a.updateRemoteList();
    },
  },

  onEdit: {
    effects: ({ s, args: [id, title] }) => ({
      ...s,
      todoMap: {
        ...s.todoMap,
        [id]: {
          ...s.todoMap[id],
          title,
        },
      },
    }),
    sideEffects: ({ a }) => {
      a.updateRemoteList();
    },
  },

  onDelete: {
    effects: ({ s, args: [id] }) => ({
      ...s,
      todoMap: Object.keys(s.todoMap).reduce<State['todoMap']>((acc, key) => {
        if (key !== id) {
          acc[key] = s.todoMap[key];
        }
        return acc;
      }, {}),
      todoIds: s.todoIds.filter((i) => i !== id),
    }),
    sideEffects: ({ a }) => {
      a.updateRemoteList();
    },
  },

  onToggle: {
    effects: ({ s, args: [id] }) => ({
      ...s,
      todoMap: {
        ...s.todoMap,
        [id]: {
          ...s.todoMap[id],
          completed: !s.todoMap[id].completed,
        },
      },
    }),
    sideEffects: ({ a }) => {
      a.updateRemoteList();
    },
  },

  onClearCompleted: {
    effects: ({ s }) => {
      const removeSet = new Set(s.todoIds.filter((id) => s.todoMap[id].completed));

      return {
        ...s,
        todoIds: s.todoIds.filter((i) => !removeSet.has(i)),
        todoMap: Object.keys(s.todoMap).reduce<State['todoMap']>((acc, key) => {
          if (!removeSet.has(key)) {
            acc[key] = s.todoMap[key];
          }
          return acc;
        }, {}),
      };
    },
    sideEffects: ({ a }) => {
      a.updateRemoteList();
    },
  },

  onSetFilter: ({ s, args: [filter] }) => ({
    ...s,
    filter,
  }),
  loadRemoteList: {
    preEffects: ({ s }) => ({ ...s, error: false }),
    getPromise: () => Promise.resolve([]),
    effects: ({ s, res }) => ({
      ...s,
      ...splitList(res),
    }),
    errorEffects: ({ s }) => ({ ...s, error: true }),
  },
  updateRemoteList: {
    preEffects: ({ s }) => ({ ...s, error: false }),
    getPromise: () => Promise.resolve(),
    errorEffects: ({ s }) => ({ ...s, error: true }),
  },
};

export const todoOptions: StoreOptions<State, Actions, Props, DerivedState> = {
  derivedState: {
    todos: {
      getDeps: ({ s }) => [s.todoIds, s.todoMap],
      get: ({ s }) => s.todoIds.map((id) => s.todoMap[id]),
    },
  },
  onPropsChange: [
    {
      getDeps: (p) => [p.initialTodos],
      effects: ({ s, p }) => ({ ...s, ...(p.initialTodos ? splitList(p.initialTodos) : {}) }),
      onMount: true,
    },
  ],
  onMount: ({ a, p }) => {
    if (p.initialTodos == null) {
      a.loadRemoteList();
    }
  },
};

const todoStore = createStore(getInitialState, todoActions, todoOptions);

export default todoStore;
