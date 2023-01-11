import { memo } from 'react';

import { Button, Box } from '@mui/material';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayIcon from '@mui/icons-material/PlayArrow';

import RequestStatus from './RequestStatus';
import { AbortViewProps } from './Abort';
import Typography from '@mui/material/Typography';

import classes from './App.module.css';

export const AbortView = memo(function AbortView(p: AbortViewProps) {
  return (
    <Box>
      <Typography variant="h6">Simple action</Typography>

      <Box>
        <RequestStatus status={p.status} duration={5} />
      </Box>
      <div>
        <Button
          variant="outlined"
          disabled={p.status === 'running'}
          className={classes.btn}
          startIcon={<PlayIcon />}
          onClick={() => p.onAction(false)}
        >
          Start
        </Button>
        <Button
          variant="outlined"
          disabled={p.status === 'running'}
          className={classes.btn}
          startIcon={<ErrorOutlineIcon />}
          onClick={() => p.onAction(true)}
        >
          Start & crash
        </Button>
        <Button
          variant="outlined"
          disabled={p.status !== 'running'}
          className={classes.btn}
          startIcon={<CancelIcon />}
          onClick={() => p.abortAction('onAction')}
        >
          Abort
        </Button>
      </div>
    </Box>
  );
});

export default AbortView;
