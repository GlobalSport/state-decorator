import { useState } from 'react';

import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

import { Item, ParallelViewProps } from './Parallel';
import CircularProgress from '@mui/material/CircularProgress';

type ItemViewProps = {
  item: Item;
  isLoading: boolean;
} & Pick<ParallelViewProps, 'onSaveItem'>;

// const useStyles = makeStyles((theme) => ({
//   btn: {
//     marginRight: theme.spacing(2),
//   },

//   box: {
//     border: '1px solid #ccc',
//     borderRadius: 5,
//   },
// }));

function ItemView(p: ItemViewProps) {
  const [value, setValue] = useState(p.item.value);
  const { item, isLoading } = p;

  return (
    <Box mb={2} p={2}>
      <Box display="flex" alignItems="center">
        <TextField
          size="small"
          label={item.id}
          value={value}
          disabled={isLoading}
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => p.onSaveItem(item.id, e.target.value)}
        />

        {isLoading && <CircularProgress />}
      </Box>
      <Box>
        <Typography>Saved value: {item.value}</Typography>
      </Box>
    </Box>
  );
}

function ParallelView(props: ParallelViewProps) {
  const { items, onSaveItem, isLoading } = props;

  // const styles = useStyles();
  const styles = {
    box: '',
  };

  return (
    <Box mt={4} p={2} className={styles.box}>
      <Typography variant="h6">Conflict Policy: Parallel</Typography>
      <Typography>
        Launch actions in parellel. Each promise is identified by an ID. Use the loadingParallelMap to get the loading
        state of each action.
      </Typography>
      <Typography>
        <b>Usage</b>: save different objects of same type in parallel.
      </Typography>
      <Box mt={1}>
        <Typography variant="caption">Same action to save text is launched on blur, in parallel, for 3s</Typography>
      </Box>
      {Object.keys(items).map((id) => {
        return <ItemView key={id} item={items[id]} onSaveItem={onSaveItem} isLoading={isLoading(['onSaveItem', id])} />;
      })}
    </Box>
  );
}

export default ParallelView;
