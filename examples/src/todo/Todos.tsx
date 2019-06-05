import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';
import produce from 'immer';
import { pick } from 'lodash';
import { Button } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';
import useCommonStyles from '../style.js';
import Checkbox from '@material-ui/core/Checkbox';
import Radio from '@material-ui/core/Radio';
import { makeStyles } from '@material-ui/styles';

const useLocalStyle = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    marginTop: 20,
  },
  todo: {
    display: 'flex',
    alignItems: 'center',
  },
  underline: {
    textDecoration: 'line-through',
  },
});

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

const Header = React.memo(function Header(
  props: Pick<State, 'newTitle'> & Pick<Actions, 'onSetNewTitle' | 'onCreate'>
) {
  const commonClasses = useCommonStyles();
  const localClasses = useLocalStyle();
  const onChange = (e) => props.onSetNewTitle(e.target.value);
  const onSubmit = (e) => {
    e.preventDefault();
    props.onCreate();
  };
  const { newTitle } = props;
  return (
    <form onSubmit={onSubmit}>
      <div className={localClasses.header}>
        <TextField label="title" value={newTitle} onChange={onChange} />
        <Button className={[commonClasses.button, localClasses.headerButton].join(' ')} type="submit">
          Create
        </Button>
      </div>
    </form>
  );
});

const Todo = React.memo(function Todo(props: { todo: TodoItem } & Actions) {
  const onToggle = (e) => props.onToggle(props.todo.id);
  const localClasses = useLocalStyle();

  const { todo } = props;
  return (
    <div className={localClasses.todo}>
      <div className={todo.completed ? localClasses.underline : ''}>{todo.title}</div>
      <label>
        <Checkbox checked={todo.completed} onChange={onToggle} />
      </label>
    </div>
  );
});

const Todos = React.memo(function Todos(props: Pick<State, 'todoIds' | 'todoMap' | 'filter'> & Actions) {
  const commonClasses = useCommonStyles();
  const filter = (todoId) => {
    const { filter, todoMap } = props;
    const todo = todoMap[todoId];

    if (filter === Filter.ALL) {
      return true;
    }

    return filter === Filter.COMPLETED ? todo.completed : !todo.completed;
  };

  const { onClearCompleted, todoIds, todoMap } = props;

  return (
    <div>
      {todoIds.filter(filter).map((todoId) => (
        <Todo key={todoId} todo={todoMap[todoId]} {...props} />
      ))}
      <Button className={commonClasses.button} onClick={onClearCompleted}>
        Clear completed
      </Button>
    </div>
  );
});

const Footer = React.memo(function Footer(props: Pick<State, 'filter'> & Actions) {
  const commonClasses = useCommonStyles();
  const onFilterChange = (e) => props.onSetFilter(e.target.value);

  const { filter } = props;
  return (
    <div>
      <div>
        <div>
          <Radio name="filter" value={Filter.ALL} checked={filter === Filter.ALL} onChange={onFilterChange} />
          All
        </div>
        <div>
          <Radio
            name="filter"
            value={Filter.NON_COMPLETED}
            checked={filter === Filter.NON_COMPLETED}
            onChange={onFilterChange}
          />
          Non Completed
        </div>
        <div>
          <Radio
            name="filter"
            value={Filter.COMPLETED}
            checked={filter === Filter.COMPLETED}
            onChange={onFilterChange}
          />
          Completed
        </div>
      </div>
    </div>
  );
});
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
            <div style={{ width: '75%', margin: '0 auto' }}>
              <Header {...actions} newTitle={state.newTitle} />
              <Footer {...actions} filter={state.filter} />
              <Todos {...actions} {...todoProps} />
            </div>
          );
        }}
      </StateDecorator>
    );
  }
}
