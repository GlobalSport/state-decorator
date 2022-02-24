import React from 'react';
import { createStore, StoreActions, useStore } from '../../src/';
import produce from 'immer';
import TodoView from './TodoView';

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

export type Actions = {
  onCreate: (title: string) => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onClearCompleted: () => void;
  onSetFilter: (filter: Filter) => void;
};

export type TodoViewProps = State & Actions;

// Initial state
const getInitialState = (): State => ({
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

// Actions implementation

const todoActions: StoreActions<State, Actions> = {
  onCreate: ({ state, args: [title] }) =>
    produce(state, (draftState) => {
      const newTodo: TodoItem = {
        title,
        id: `id${draftState.idCount}`,
        completed: false,
      };
      draftState.idCount++;
      draftState.todoMap[newTodo.id] = newTodo;
      draftState.todoIds.push(newTodo.id);
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

  onSetFilter: ({ s, args: [filter] }) => ({
    filter,
  }),
};

export const todoStore = createStore(getInitialState, todoActions);

export default function () {
  // Store is bound to this React component
  // If store changes, component is refreshed
  // When this component is destroyed, the store will be destroyed too.
  const { state, actions } = useStore(todoStore, {});

  return <TodoView {...state} {...actions} />;
}
