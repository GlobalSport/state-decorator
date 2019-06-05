import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';
import produce from 'immer';
import { pick } from 'lodash';
import { Button } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';
import useCommonStyles from '../style.js';

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

const Header = (props: Pick<State, 'newTitle'> & Pick<Actions, 'onSetNewTitle' | 'onCreate'>) => {
  const classes = useCommonStyles();
  const onChange = (e) => props.onSetNewTitle(e.target.value);
  const onSubmit = (e) => {
    e.preventDefault();
    props.onCreate();
  };
  const { newTitle } = props;
  return (
    <form onSubmit={onSubmit}>
      <TextField label="title" value={newTitle} onChange={onChange} />
      <Button className={classes.button} type="submit">
        Create
      </Button>
    </form>
  );
};

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

const Todos = (props: Pick<State, 'todoIds' | 'todoMap' | 'filter'> & Actions) => {
  const filter = (todoId) => {
    const { filter, todoMap } = props;
    const todo = todoMap[todoId];

    if (filter === Filter.ALL) {
      return true;
    }

    return filter === Filter.COMPLETED ? todo.completed : !todo.completed;
  };

  const { todoIds, todoMap } = props;

  return (
    <div>
      {todoIds.filter(filter).map((todoId) => (
        <Todo key={todoId} todo={todoMap[todoId]} {...props} />
      ))}
    </div>
  );
};

const Footer = (props: Pick<State, 'filter'> & Actions) => {
  const classes = useCommonStyles();
  const onFilterChange = (e) => props.onSetFilter(e.target.value);

  const { onClearCompleted, filter } = props;
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
      <Button className={classes.button} onClick={onClearCompleted}>
        Clear completed
      </Button>
    </div>
  );
};
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
