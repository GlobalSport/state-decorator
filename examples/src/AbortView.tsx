import React from 'react';

import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';

import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import CancelIcon from '@material-ui/icons/Cancel';
import PlayIcon from '@material-ui/icons/PlayArrow';

import { makeStyles } from '@material-ui/core/styles';
import RequestStatus from './RequestStatus';
import { AbortViewProps } from './Abort';
import Typography from '@material-ui/core/Typography';

export const AbortView = React.memo(function AbortView(p: AbortViewProps) {
  const styles = useStyles({});
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
          className={styles.btn}
          startIcon={<PlayIcon />}
          onClick={() => p.onAction(false)}
        >
          Start
        </Button>
        <Button
          variant="outlined"
          disabled={p.status === 'running'}
          className={styles.btn}
          startIcon={<ErrorOutlineIcon />}
          onClick={() => p.onAction(true)}
        >
          Start & crash
        </Button>
        <Button
          variant="outlined"
          disabled={p.status !== 'running'}
          className={styles.btn}
          startIcon={<CancelIcon />}
          onClick={() => p.abortAction('onAction')}
        >
          Abort
        </Button>
      </div>
    </Box>
  );
});

const useStyles = makeStyles((theme) => ({
  btn: {
    marginRight: theme.spacing(2),
  },
}));

export default AbortView;
