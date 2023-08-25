import useLocalStore, { StoreConfig } from './sd_src';
import produce from 'immer';
import TodoView from './TodoView';
import { setArgIn } from './sd/helpers';

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
  todoMap: { [id: string]: TodoItem };
  todoIds: string[];
  idCount: number;
  filter: Filter;
};

export type DerivedState = {
  filteredTodoIds: string[];
};

export type Actions = {
  onCreate: (title: string) => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onClearCompleted: () => void;
  onSetFilter: (filter: Filter) => void;
};

export type TodoViewProps = State & DerivedState & Actions;

const storeConfig: StoreConfig<State, Actions, {}, DerivedState> = {
  name: 'Todo',

  getInitialState: () => ({
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
  }),

  actions: {
    onCreate: ({ s, args: [title] }) =>
      produce(s, (s) => {
        const newTodo: TodoItem = {
          title,
          id: `id${s.idCount}`,
          completed: false,
        };
        s.idCount++;
        s.todoMap[newTodo.id] = newTodo;
        s.todoIds.push(newTodo.id);
      }),

    onEdit: {
      effects: ({ s, args: [id, title] }) =>
        produce(s, (s) => {
          s.todoMap[id].title = title;
        }),
      sideEffects: () => {
        console.log('coucou swewe');
      },
    },

    onDelete: ({ s, args: [id] }) =>
      produce(s, (s) => {
        delete s.todoMap[id];
        s.todoIds = s.todoIds.filter((todoId) => todoId !== id);
      }),

    onToggle: ({ s, args: [id] }) =>
      produce(s, (s) => {
        const todo = s.todoMap[id];
        todo.completed = !todo.completed;
      }),

    onClearCompleted: ({ s }) =>
      produce(s, (s) => {
        s.todoIds = s.todoIds.filter((id) => {
          const todo = s.todoMap[id];
          if (todo.completed) {
            delete s.todoMap[todo.id];
          }
          return !todo.completed;
        });
      }),

    onSetFilter: setArgIn('filter'),
  },

  logEnabled: true,

  derivedState: {
    filteredTodoIds: {
      getDeps: ({ s }) => [s.todoIds, s.todoMap, s.filter],
      get: ({ s: { todoIds, todoMap, filter } }) =>
        filter === Filter.ALL
          ? todoIds
          : todoIds.filter((todoId: string) => {
              const todo = todoMap[todoId];
              return filter === Filter.COMPLETED ? todo.completed : !todo.completed;
            }),
    },
  },
};

export default function () {
  // Store is bound to this React component
  // If store changes, component is refreshed
  // When this component is destroyed, the store will be destroyed too.
  const { state, actions } = useLocalStore(storeConfig);

  return <TodoView {...state} {...actions} />;
}
