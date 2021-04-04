import React, { useState, useEffect } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import CircularProgress from '@material-ui/core/CircularProgress';
import Box from '@material-ui/core/Box';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

import PauseCircleOutlineIcon from '@material-ui/icons/PauseCircleOutline';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import CancelIcon from '@material-ui/icons/Cancel';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import { Status } from './types';

export type RequestStatusProps = {
  duration: number;
  status: Status;
  size?: number;
};

export default function RequestStatus(p: RequestStatusProps) {
  const { size = 50, duration, status } = p;
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  function reset() {
    setSeconds(0);
    setIsActive(false);
  }

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds * 1000 === duration) {
          reset();
        }
        setSeconds((seconds) => seconds + 250);
      }, 250);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, duration]);

  useEffect(() => {
    if (status === 'running') {
      setIsActive(true);
    } else {
      reset();
    }
  }, [status]);

  let content: JSX.Element;

  const styles = useStyles({ size, status });

  switch (status) {
    case 'paused':
      content = <PauseCircleOutlineIcon className={styles.icon} />;
      break;
    case 'succeeded':
      content = <CheckCircleOutlineIcon className={styles.icon} />;
      break;
    case 'aborted':
      content = <CancelIcon className={styles.icon} />;
      break;
    case 'errored':
      content = <ErrorOutlineIcon className={styles.icon} />;
      break;
    default:
      content = (
        <React.Fragment>
          <CircularProgress variant="determinate" size={size} value={((seconds / 1000) * 100) / duration} />
          <Box
            position="absolute"
            left={0}
            top={0}
            width="100%"
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Typography>{p.duration - Math.floor(seconds / 1000)}</Typography>
          </Box>
        </React.Fragment>
      );
  }

  return (
    <Tooltip title={`Action status: ${status}`}>
      <Box position="relative" display="inline-block" width={size} height={size}>
        {content}
      </Box>
    </Tooltip>
  );
}

const useStyles = makeStyles((theme) => ({
  icon: (p: { size: number; status: Status }) => {
    let color = theme.palette.primary.main;
    switch (p.status) {
      case 'succeeded':
        color = theme.palette.success.main;
        break;
      case 'errored':
        color = theme.palette.error.main;
        break;
      case 'aborted':
        color = theme.palette.warning.main;
        break;
    }

    return {
      color,
      width: `${p.size}px`,
      height: `${p.size}px`,
    };
  },
}));
