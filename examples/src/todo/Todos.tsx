import React from 'react';
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

class Header extends React.PureComponent<Pick<State, 'newTitle'> & Pick<Actions, 'onSetNewTitle' | 'onCreate'>> {
  onChange = (e) => this.props.onSetNewTitle(e.target.value);
  onSubmit = (e) => {
    e.preventDefault();
    this.props.onCreate();
  };
  render() {
    const { newTitle } = this.props;
    return (
      <form onSubmit={this.onSubmit}>
        <input value={newTitle} onChange={this.onChange} />
        <button type="submit">Create</button>
      </form>
    );
  }
}

class Todo extends React.PureComponent<{ todo: TodoItem } & Actions> {
  onToggle = (e) => this.props.onToggle(this.props.todo.id);

  render() {
    const { todo } = this.props;
    return (
      <div>
        <div>{todo.title}</div>
        <label>
          <input type="checkbox" checked={todo.completed} onChange={this.onToggle} />
          completed
        </label>
      </div>
    );
  }
}

class Todos extends React.PureComponent<Pick<State, 'todoIds' | 'todoMap' | 'filter'> & Actions> {
  filter = (todoId) => {
    const { filter, todoMap } = this.props;
    const todo = todoMap[todoId];

    if (filter === Filter.ALL) {
      return true;
    }

    return filter === Filter.COMPLETED ? todo.completed : !todo.completed;
  };

  render() {
    const { todoIds, todoMap } = this.props;

    return (
      <div>
        {todoIds.filter(this.filter).map((todoId) => (
          <Todo key={todoId} todo={todoMap[todoId]} {...this.props} />
        ))}
      </div>
    );
  }
}

class Footer extends React.PureComponent<Pick<State, 'filter'> & Actions> {
  onFilterChange = (e) => this.props.onSetFilter(e.target.value);

  render() {
    const { onClearCompleted, filter } = this.props;
    return (
      <div>
        <label>
          <input
            type="radio"
            name="filter"
            value={Filter.ALL}
            checked={filter === Filter.ALL}
            onChange={this.onFilterChange}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="filter"
            value={Filter.NON_COMPLETED}
            checked={filter === Filter.NON_COMPLETED}
            onChange={this.onFilterChange}
          />
          Non Completed
        </label>
        <label>
          <input
            type="radio"
            name="filter"
            value={Filter.COMPLETED}
            checked={filter === Filter.COMPLETED}
            onChange={this.onFilterChange}
          />
          Completed
        </label>
        <button onClick={onClearCompleted}>Clear completed</button>
      </div>
    );
  }
}
// Container that is managing the state.
export default class TodoContainer extends React.Component {
  static actions: StateDecoratorActions<State, Actions> = {
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

  render() {
    return (
      <StateDecorator<State, Actions> actions={TodoContainer.actions} initialState={getInitialState()}>
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
}
