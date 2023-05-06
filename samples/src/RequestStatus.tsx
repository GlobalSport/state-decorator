import React, { useState, useEffect } from 'react';

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
      content = (
        <>
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
        </>
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
