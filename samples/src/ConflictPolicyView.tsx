import RequestStatus from './RequestStatus';

import { TextField, Box, Typography } from '@mui/material';

import { ConflictPolicyViewProps } from './ConflictPolicy';

import classes from './ConflictPolicy.module.css';
import { useRef } from 'react';

// Stateless component
// Separate container from view to test more easily the view.

function ConflictPolicyView(p: ConflictPolicyViewProps) {
  const { title, description, usage, calls, executions, text, status, onSaveText } = p;

  const ref = useRef<{ reset: () => void }>();

  return (
    <Box mb={2} p={2} className={classes.box}>
      <Typography variant="h6">Conflict Policy: {title}</Typography>
      <Typography>{description}</Typography>
      <Typography>
        <b>Usage</b>: {usage}
      </Typography>
      <Box mt={1}>
        <Typography variant="caption">Each character typed triggers a 2s action.</Typography>
      </Box>
      <Box mt={2} mb={2}>
        <TextField
          size="small"
          onChange={(e) =>
            onSaveText(e.target.value)?.catch((e) => {
              if (e.message === 'aborted') {
                ref.current?.reset();
              }
            })
          }
          placeholder="Type text here"
        />
      </Box>
      <RequestStatus ref={ref} status={status} duration={2} />
      <Box mt={1}>
        <Typography>Action calls: {calls}</Typography>
      </Box>
      <Box mt={1}>
        <Typography>Executions: {executions}</Typography>
      </Box>

      <Box mt={1}>
        <Typography>Saved state: {text}</Typography>
      </Box>
    </Box>
  );
}

export default ConflictPolicyView;
