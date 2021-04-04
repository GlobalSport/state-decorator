import React from 'react';

import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import TableOpti from './TableOpti';
import TableRegular from './TableRegular';

export default function TableApp() {
  return (
    <Box>
      <Typography variant="h6">Tables</Typography>
      <Typography variant="caption">
        Both tables are connecting to the same store but the top table is using <code>useSliceStore</code> and the
        bottom one is using props flowing. A blink means that the component is re-rendered.
      </Typography>
      <TableOpti />
      <TableRegular />
    </Box>
  );
}
