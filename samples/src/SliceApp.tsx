import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import GlobalStateSlice from './GlobalStateSlice';
import LocalStateSlice from './LocalStateSlice';

function SliceApp() {
  console.log('SLICE');

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Global State</Typography>
        <GlobalStateSlice />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Local State</Typography>
        <LocalStateSlice />
      </Box>
    </Box>
  );
}

export default SliceApp;
