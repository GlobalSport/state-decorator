import React from 'react';
import { OptimisticViewProps } from './Optimistic';

import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';

import { makeStyles } from '@material-ui/core/styles';
import RequestStatus from './RequestStatus';
import { Typography } from '@material-ui/core';

// Stateless component
// Separate container from view to test more easily the view.
const OptimisticView = function OptimisticView(props: OptimisticViewProps) {
  const { value, status } = props;

  const styles = useStyles({});

  return (
    <Box>
      <Typography variant="h6">Optimistic actions</Typography>
      <Typography variant="caption">
        ⚠ The optimistic middleware must be set on your store
        <br />
        When the optimistic asynchronous action is called it's behaving like a synchronous actions unless the promise
        fails and the the effects is reverted.
      </Typography>
      <Box mt={2}>
        <Box display="flex" alignItems="centers">
          <RequestStatus status={status} duration={5} />
          <Box className={styles.valueBox} ml={2}>
            <Typography>{value}</Typography>
          </Box>
        </Box>

        <Box mt={1}>
          <Button
            variant="outlined"
            className={styles.btn}
            onClick={() => props.sendAction(false)}
            startIcon={<PlayArrowIcon />}
          >
            Start
          </Button>
          <Button
            variant="outlined"
            className={styles.btn}
            startIcon={<ErrorOutlineIcon />}
            onClick={() => props.sendAction(true)}
          >
            Start & fail
          </Button>
          <Button
            variant="outlined"
            className={styles.btn}
            startIcon={<RotateLeftIcon />}
            onClick={() => props.resetValue()}
          >
            Reset
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

const useStyles = makeStyles((theme) => ({
  btn: {
    marginRight: theme.spacing(2),
    marginTop: theme.spacing(1),
  },

  valueBox: {
    display: 'flex',
    alignItems: 'center',

    border: '1px solid #ccc',
    padding: theme.spacing(1),
    borderRadius: 4,
  },
}));

export default OptimisticView;
