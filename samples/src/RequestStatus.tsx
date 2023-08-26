import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';

import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Status } from './types';

import classes from './RequestStatus.module.css';
import clsx from './clsx';

export type RequestStatusProps = {
  duration: number;
  status: Status;
  size?: number;
};

export default forwardRef<{ reset: () => void }, RequestStatusProps>(function RequestStatus(p, ref) {
  const { size = 50, duration, status } = p;
  const [seconds, setSeconds] = useState(0);

  function restart() {
    setSeconds(0);
  }

  useImperativeHandle(
    ref,
    () => ({
      reset: restart,
    }),
    []
  );

  useEffect(() => {
    let interval: any;
    if (status === 'running') {
      interval = setInterval(() => {
        if (seconds >= duration * 1000) {
          clearInterval(interval);
        } else {
          setSeconds(seconds + 250);
        }
      }, 250);
    } else if (seconds !== 0) {
      setSeconds(0);
      clearInterval(interval);
    }
    return () => {
      clearInterval(interval);
    };
  }, [status, seconds, duration]);

  let content: JSX.Element;

  switch (status) {
    case 'paused':
      content = <PauseCircleOutlineIcon className={clsx(classes.icon, classes.paused)} />;
      break;
    case 'succeeded':
      content = <CheckCircleOutlineIcon className={clsx(classes.icon, classes.succeeded)} />;
      break;
    case 'aborted':
      content = <CancelIcon className={clsx(classes.icon, classes.aborted)} />;
      break;
    case 'errored':
      content = <ErrorOutlineIcon className={clsx(classes.icon, classes.errored)} />;
      break;
    default:
      content = <CircularProgress variant="indeterminate" size={size} />;
  }

  return (
    <Tooltip title={`Action status: ${status}`}>
      <Box position="relative" display="inline-block" width={size} height={size}>
        {content}
      </Box>
    </Tooltip>
  );
});
