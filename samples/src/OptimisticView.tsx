import { OptimisticViewProps } from './Optimistic';

import { Button, Box, Typography } from '@mui/material';
import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { RotateLeft as RotateLeftIcon } from '@mui/icons-material';
import { ErrorOutline as ErrorOutlineIcon } from '@mui/icons-material';

import RequestStatus from './RequestStatus';

import commonClasses from './App.module.css';
import classes from './Optimistic.module.css';

// Stateless component
// Separate container from view to test more easily the view.
function OptimisticView(props: OptimisticViewProps) {
  const { value, status } = props;

  return (
    <Box>
      <Typography variant="h6">Optimistic actions</Typography>
      <Typography variant="caption">
        ⚠ The <code>optimisticActions</code> middleware must be set on your store.
        <br />
        When the optimistic asynchronous action is called it's behaving like a synchronous actions unless the promise
        fails and the the effects is reverted.
      </Typography>
      <Box mt={2}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <RequestStatus status={status} duration={5} />
          <Box sx={{ ml: 2 }} className={classes.valueBox}>
            <Typography>{value}</Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            className={commonClasses.btn}
            onClick={() => props.sendAction(false)}
            startIcon={<PlayArrowIcon />}
          >
            Start
          </Button>
          <Button
            variant="outlined"
            className={commonClasses.btn}
            startIcon={<ErrorOutlineIcon />}
            onClick={() => props.sendAction(true)}
          >
            Start & fail
          </Button>
          <Button
            variant="outlined"
            className={commonClasses.btn}
            startIcon={<RotateLeftIcon />}
            onClick={() => props.resetValue()}
          >
            Reset
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default OptimisticView;
