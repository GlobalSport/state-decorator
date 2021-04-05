import React, { useCallback, useEffect, useMemo, useState, KeyboardEvent } from 'react';

import { makeStyles } from '@material-ui/core';

import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Checkbox from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import Paper from '@material-ui/core/Paper';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';

import TextField from '@material-ui/core/TextField';

import { Card, Typography } from '@material-ui/core';
import produce from 'immer';
import useLocalStore, { StoreActions } from '../../dist';

const useStyles = makeStyles((theme) => ({
  body: {
    backgroundColor: '#eee',
  },
}));

const NewTodo = React.memo(function NewTodo(props: Pick<TodoViewProps, 'onCreate'>) {
  const { onCreate } = props;

  const [title, setTitle] = useState('');

  const onChange = useCallback((e) => setTitle(e.target.value), [setTitle]);

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault();
      onCreate(title);
      setTitle('');
    },
    [onCreate, title, setTitle]
  );

  return (
    <Card>
      <Box p={2}>
        <form onSubmit={onSubmit}>
          <Box display="flex">
            <Box flex={1}>
              <TextField fullWidth value={title} placeholder="New todo" onChange={onChange} />
            </Box>
            <Box ml={2}>
              <Button variant="contained" color="primary" type="submit">
                Add
              </Button>
            </Box>
          </Box>
        </form>
      </Box>
    </Card>
  );
});

const Todo = React.memo(function Todo(props: { todo: TodoItem } & Pick<TodoViewProps, 'onToggle' | 'onEdit'>) {
  const { todo, onToggle, onEdit } = props;

  // local state: save on blur or enter key
  const [title, setTitle] = useState(todo.title);

  useEffect(() => {
    setTitle(todo.title);
  }, [todo.title]);

  const onToggleHandler = useCallback(() => onToggle(todo.id), [onToggle, todo.id]);

  const onBlurHandler = () => onEdit(todo.id, title);
  const onKeydownHandler = (e: KeyboardEvent<any>) => {
    if (e.key === 'Enter') {
      onEdit(todo.id, title);
    }
  };

  return (
    <ListItem>
      <ListItemText>
        <TextField
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={onKeydownHandler}
          onBlur={onBlurHandler}
        />
      </ListItemText>
      <ListItemSecondaryAction>
        <Checkbox checked={todo.completed} onChange={onToggleHandler} />
      </ListItemSecondaryAction>
    </ListItem>
  );
});

const Todos = React.memo(function Todos(
  props: Pick<TodoViewProps, 'todoIds' | 'todoMap' | 'filter' | 'onSetFilter' | 'onToggle' | 'onEdit'>
) {
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
    <Paper>
      <Box>
        {filteredTodos.length === 0 && (
          <Box p={2}>
            <Typography>Nothing!</Typography>
          </Box>
        )}

        {filteredTodos.length > 0 && (
          <List>
            {filteredTodos.map((todoId) => (
              <Todo key={todoId} todo={todoMap[todoId]} onEdit={props.onEdit} onToggle={props.onToggle} />
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
});

const Filters = React.memo(function Filters(props: Pick<TodoViewProps, 'filter' | 'onClearCompleted' | 'onSetFilter'>) {
  const { onClearCompleted, filter, onSetFilter } = props;

  const onFilterChange = useCallback((e) => onSetFilter(e.target.value), [onSetFilter]);

  return (
    <Paper>
      <Box p={2}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Filter</FormLabel>
          <RadioGroup aria-label="gender" name="gender1" value={filter} onChange={onFilterChange}>
            <FormControlLabel value={Filter.ALL} control={<Radio />} label="All" />
            <FormControlLabel value={Filter.NON_COMPLETED} control={<Radio />} label="Not completed" />
            <FormControlLabel value={Filter.COMPLETED} control={<Radio />} label="Completed" />
          </RadioGroup>
        </FormControl>

        <Box mt={2}>
          <Button variant="outlined" onClick={onClearCompleted}>
            Clear completed
          </Button>
        </Box>
      </Box>
    </Paper>
  );
});

function TodoView(props: TodoViewProps) {
  const styles = useStyles({});
  return (
    <Box className={styles.body} padding={2}>
      <Box mb={2}>
        <NewTodo onCreate={props.onCreate} />
      </Box>

      <Grid container direction="row" alignItems="stretch" spacing={2}>
        <Grid item xs={12} sm={8}>
          <Todos {...props} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Filters filter={props.filter} onClearCompleted={props.onClearCompleted} onSetFilter={props.onSetFilter} />
        </Grid>
      </Grid>
    </Box>
  );
}

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
export const getInitialState = (): State => ({
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

export const todoActions: StoreActions<State, Actions> = {
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
    ...s,
    filter,
  }),
};

// Container that is managing the state using usetateDecorator hook
export default function () {
  const { state, actions } = useLocalStore(getInitialState, todoActions, {});

  return <TodoView {...state} {...actions} />;
}
