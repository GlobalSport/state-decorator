import { useCallback, useEffect, useState, KeyboardEvent, memo } from 'react';

import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

import TextField from '@mui/material/TextField';

import { TodoViewProps, TodoItem, Filter } from './TodoApp';
import { Card, Typography } from '@mui/material';

const NewTodo = memo(function NewTodo(props: Pick<TodoViewProps, 'onCreate'>) {
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

const Todo = memo(function Todo(props: { todo: TodoItem } & Pick<TodoViewProps, 'onToggle' | 'onEdit'>) {
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

const Todos = memo(function Todos(props: Pick<TodoViewProps, 'filteredTodoIds' | 'todoMap' | 'onToggle' | 'onEdit'>) {
  const { filteredTodoIds, todoMap } = props;

  return (
    <Paper>
      <Box>
        {filteredTodoIds.length === 0 && (
          <Box p={2}>
            <Typography>Nothing!</Typography>
          </Box>
        )}

        {filteredTodoIds.length > 0 && (
          <List>
            {filteredTodoIds.map((todoId) => (
              <Todo key={todoId} todo={todoMap[todoId]} onEdit={props.onEdit} onToggle={props.onToggle} />
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
});

const Filters = memo(function Filters(props: Pick<TodoViewProps, 'filter' | 'onClearCompleted' | 'onSetFilter'>) {
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

export default function TodoView(props: TodoViewProps) {
  return (
    <Box sx={{ p: 2 }}>
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
