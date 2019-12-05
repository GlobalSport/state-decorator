import React, { useMemo } from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';
import produce from 'immer';
import { pick } from 'lodash';

export enum Filter {
  ALL = 'all',
  COMPLETED = 'completed',
  NON_COMPLETED = 'non_completed',
}

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

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

type TodoView = State & Actions;

const Header = React.memo(function(props: Pick<TodoView, 'newTitle' | 'onSetNewTitle' | 'onCreate'>) {
  const onChange = (e) => props.onSetNewTitle(e.target.value);
  const onSubmit = (e) => {
    e.preventDefault();
    props.onCreate();
  };

  const { newTitle } = props;
  return (
    <form onSubmit={onSubmit}>
      <input value={newTitle} onChange={onChange} />
      <button type="submit">Create</button>
    </form>
  );
});

// class Todo extends React.PureComponent<{ todo: TodoItem } & Actions> {
const Todo = React.memo(function(props: { todo: TodoItem } & Pick<TodoView, 'onToggle'>) {
  const onToggle = (e) => props.onToggle(props.todo.id);

  const { todo } = props;
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

const Todos = React.memo(function(props: Pick<TodoView, 'todoIds' | 'todoMap' | 'filter' | 'onToggle'>) {
  const { filter, todoIds, todoMap } = props;

  const filteredTodos = useMemo(
    () => {
      const todos = todoIds.map((id) => todoMap[id]);
      return filter === Filter.ALL
        ? todos
        : todos.filter((todo) => (filter === Filter.COMPLETED ? todo.completed : !todo.completed));
    },
    [filter, todoIds, todoMap]
  );

  return (
    <div>
      {filteredTodos.map((todo) => (
        <Todo key={todo.id} todo={todo} {...props} />
      ))}
    </div>
  );
});

const Footer = React.memo(function(props: Pick<TodoView, 'filter' | 'onSetFilter' | 'onClearCompleted'>) {
  const { onClearCompleted, filter } = props;

  const onFilterChange = (e) => props.onSetFilter(e.target.value);

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

export const actions: StateDecoratorActions<State, Actions> = {
  onCreate: (state) =>
    produce<State>(state, (draftState) => {
      const newTodo: TodoItem = {
        title: state.newTitle,
        id: `${draftState.idCount}`,
        completed: false,
      };
      draftState.idCount++;
      draftState.todoMap[newTodo.id] = newTodo;
      draftState.todoIds.push(newTodo.id);
      draftState.newTitle = '';
    }),

  onEdit: (state, [id, title]) =>
    produce<State>(state, (draftState) => {
      draftState.todoMap[id].title = title;
    }),

  onDelete: (state, [id]) =>
    produce<State>(state, (draftState) => {
      delete draftState.todoMap[id];
      draftState.todoIds = draftState.todoIds.filter((todoId) => todoId !== id);
    }),

  onToggle: (state, [id]) =>
    produce<State>(state, (draftState) => {
      const todo = draftState.todoMap[id];
      todo.completed = !todo.completed;
    }),

  onClearCompleted: (state) =>
    produce<State>(state, (draftState) => {
      draftState.todoIds = draftState.todoIds.filter((id) => {
        const todo = draftState.todoMap[id];
        if (todo.completed) {
          delete draftState.todoMap[todo.id];
        }
        return !todo.completed;
      });
    }),

  onSetNewTitle: (s, [newTitle]) => ({
    ...s,
    newTitle,
  }),

  onSetFilter: (s, [filter]) => ({
    ...s,
    filter,
  }),
};

// Container that is managing the state.
export default function TodoContainer() {
  return (
    <StateDecorator<State, Actions> actions={actions} getInitialState={getInitialState}>
      {(state, actions) => {
        const todoProps = pick(state, 'todoMap', 'todoIds', 'filter');
        return (
          <div>
            <Header {...actions} newTitle={state.newTitle} />
            <Todos {...actions} {...todoProps} />
            <Footer {...actions} filter={state.filter} />
          </div>
        );
      }}
    </StateDecorator>
  );
}
