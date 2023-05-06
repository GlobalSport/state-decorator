import { memo } from 'react';
import { DebounceViewProps } from './Debounce';

import { Typography, TextField, Box } from '@mui/material';

// Stateless component
// Separate container from view to test more easily the view.
export default memo(function DebounceView(props: DebounceViewProps) {
  return (
    <Box>
      <Typography variant="h6">Debounced synchronous action</Typography>
      <Typography variant="caption">
        The action side effect is executed after a timeout while the effects are executed immediately.
      </Typography>
      <Box mt={2}>
        <TextField
          size="small"
          variant="outlined"
          placeholder="Type text here..."
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
      </Box>
      <Box>
        <Typography>
          Validation({props.calls} calls):&nbsp;{props.validationMessage}
        </Typography>
      </Box>
      <Box>
        <Typography>
          Validation (debounced, {props.callsDebounced} calls):&nbsp;
          {props.validationMessageDebounced}
        </Typography>
      </Box>
    </Box>
  );
});
