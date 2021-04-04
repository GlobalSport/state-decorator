import React, { useState } from 'react';

import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import CancelIcon from '@material-ui/icons/Cancel';

import { Item, ParallelAbortViewProps } from './ParallelAbort';
import RequestStatus from './RequestStatus';

type ItemViewProps = {
  item: Item;
} & Pick<ParallelAbortViewProps, 'abortAction' | 'onSaveItem'>;

function ItemView(p: ItemViewProps) {
  const [value, setValue] = useState(p.item.value);
  const { item } = p;

  return (
    <Box mt={2}>
      <Box display="flex" alignItems="center">
        <TextField
          label={item.id}
          value={value}
          disabled={item.status === 'running'}
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => p.onSaveItem(item.id, e.target.value)}
        />

        <RequestStatus status={item.status} duration={5} />
      </Box>
      <Box>
        <Typography>Saved value: {item.value}</Typography>{' '}
      </Box>
      <Box>
        <Button
          variant="outlined"
          disabled={item.status !== 'running'}
          onClick={() => p.abortAction('onSaveItem', item.id)}
          startIcon={<CancelIcon />}
        >
          Abort
        </Button>
      </Box>
    </Box>
  );
}

function ParallelAbortView(props: ParallelAbortViewProps) {
  const { items, onSaveItem } = props;
  return (
    <Box mt={4}>
      <Typography variant="h6">Parallel actions</Typography>
      <Typography variant="caption">Save text action is launched on blur, in parallel, for 5s</Typography>
      {Object.keys(items).map((id) => {
        return <ItemView key={id} item={items[id]} onSaveItem={onSaveItem} abortAction={props.abortAction} />;
      })}
    </Box>
  );
}

export default ParallelAbortView;
