import { Box, Typography } from '@mui/material';

import TableOpti from './TableOpti';
import TableRegular from './TableRegular';

export default function TableApp() {
  return (
    <Box>
      <Typography variant="h4">Tables</Typography>
      <Typography variant="caption">
        Both tables are connecting to the same store but the top table is using <code>useSliceStore</code> and the
        bottom one is using props flowing. A blink means that the component is re-rendered.
      </Typography>
      <Typography variant="h6">Optimized table</Typography>

      <TableOpti />

      <Typography variant="h6">Regular table</Typography>

      <TableRegular />
    </Box>
  );
}
