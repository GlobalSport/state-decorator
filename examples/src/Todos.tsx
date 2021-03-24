import React, { useCallback, useMemo } from 'react';
import produce from 'immer';
import { pick } from 'lodash';
import useLocalStore, { StoreActions } from '../../src';

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
  newTitle: string;
  filter: Filter;
};

export const getInitialState = (): State => ({
  todoMap: {},
  todoIds: [],
  idCount: 0,
  newTitle: '',
  filter: Filter.ALL,
});

export type Actions = {
  onCreate: () => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onClearCompleted: () => void;
  onSetNewTitle: (title: string) => void;
  onSetFilter: (filter: Filter) => void;
};

export const todoActions: StoreActions<State, Actions> = {
  onCreate: ({ state }) =>
    produce(state, (draftState) => {
      const newTodo: TodoItem = {
        title: state.newTitle,
        id: `id${draftState.idCount}`,
        completed: false,
      };
      draftState.idCount++;
      draftState.todoMap[newTodo.id] = newTodo;
      draftState.todoIds.push(newTodo.id);
      draftState.newTitle = '';
    }),

  onEdit: ({ state, args: [id, title] }) =>
    produce(state, (draftState) => {
      draftState.todoMap[id].title = title;
    }),

  onDelete: ({ state, args: [id] }) =>
    produce(state, (draftState) => {
      delete draftState.todoMap[id];
      draftState.todoIds = draftState.todoIds.filter((todoId) => todoId !== id);
    }),

  onToggle: ({ state, args: [id] }) =>
    produce(state, (draftState) => {
      const todo = draftState.todoMap[id];
      todo.completed = !todo.completed;
    }),

  onClearCompleted: ({ state }) =>
    produce(state, (draftState) => {
      draftState.todoIds = draftState.todoIds.filter((id) => {
        const todo = draftState.todoMap[id];
        if (todo.completed) {
          delete draftState.todoMap[todo.id];
        }
        return !todo.completed;
      });
    }),

  onSetNewTitle: ({ s, args: [newTitle] }) => ({
    ...s,
    newTitle,
  }),

  onSetFilter: ({ s, args: [filter] }) => ({
    ...s,
    filter,
  }),
};

const Header = React.memo(function Header(
  props: Pick<State, 'newTitle'> & Pick<Actions, 'onSetNewTitle' | 'onCreate'>
) {
  const onChange = useCallback((e) => props.onSetNewTitle(e.target.value), []);
  const onSubmit = useCallback((e) => {
    e.preventDefault();
    props.onCreate();
  }, []);

  const { newTitle } = props;
  return (
    <form onSubmit={onSubmit}>
      <input value={newTitle} onChange={onChange} />
      <button type="submit">Create</button>
    </form>
  );
});

const Todo = React.memo(function Todo(props: { todo: TodoItem } & Actions) {
  const { todo } = props;

  const onToggle = useCallback((e) => props.onToggle(todo.id), [todo.id]);

  return (
    <div>
      <div>{todo.title}</div>
      <label>
        <input type="checkbox" checked={todo.completed} onChange={onToggle} />
        completed
      </label>
    </div>
  );
});

const Todos = React.memo(function Todos(props: Pick<State, 'todoIds' | 'todoMap' | 'filter'> & Actions) {
  const { filter, todoIds, todoMap } = props;

  const filteredTodos = useMemo(
    () =>
      filter === Filter.ALL
        ? todoIds
        : todoIds.filter((todoId: string) => {
            const todo = todoMap[todoId];
            return filter === Filter.COMPLETED ? todo.completed : !todo.completed;
          }),
    [todoMap, todoIds, filter]
  );

  return (
    <div>
      {filteredTodos.map((todoId) => (
        <Todo key={todoId} todo={todoMap[todoId]} {...props} />
      ))}
    </div>
  );
});

const Footer = React.memo(function Footer(props: Pick<State, 'filter'> & Actions) {
  const { onClearCompleted, filter } = props;

  const onFilterChange = useCallback((e) => props.onSetFilter(e.target.value), []);

  return (
    <div>
      <label>
        <input
          type="radio"
          name="filter"
          value={Filter.ALL}
          checked={filter === Filter.ALL}
          onChange={onFilterChange}
        />
        All
      </label>
      <label>
        <input
          type="radio"
          name="filter"
          value={Filter.NON_COMPLETED}
          checked={filter === Filter.NON_COMPLETED}
          onChange={onFilterChange}
        />
        Non Completed
      </label>
      <label>
        <input
          type="radio"
          name="filter"
          value={Filter.COMPLETED}
          checked={filter === Filter.COMPLETED}
          onChange={onFilterChange}
        />
        Completed
      </label>
      <button onClick={onClearCompleted}>Clear completed</button>
    </div>
  );
});

// Container that is managing the state.
export default function TodoContainer() {
  const { state, actions } = useLocalStore(getInitialState, todoActions, {}, { name: 'TODO' });
  const todoProps = pick(state, 'todoMap', 'todoIds', 'filter');

  return (
    <div>
      <Header {...actions} newTitle={state.newTitle} />
      <Todos {...actions} {...todoProps} />
      <Footer {...actions} filter={state.filter} />
    </div>
  );
}
