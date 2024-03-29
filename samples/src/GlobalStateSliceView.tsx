import { useStoreSlice } from './sd_src';

import { store } from './GlobalStateSlice';
import FlashingBox from './FlashingBox';

import { Typography, Box, Button, Grid, CircularProgress } from '@mui/material';

import classes from './Slice.module.css';

function Buttons() {
  const a = useStoreSlice(store, ['setValue1', 'setValue2']);

  return (
    <FlashingBox>
      <Box>
        <Button variant="outlined" className={classes.btn} onClick={() => a.setValue1('test1')}>
          Set Value 1 to "test1"
        </Button>
        <Button variant="outlined" onClick={() => a.setValue2('test2')}>
          Set Value 2 to "test2"
        </Button>
      </Box>
    </FlashingBox>
  );
}

type ValueProps = {
  isLoading: boolean;
  value: string;
  title: string;
};

function Value(p: ValueProps) {
  const { value, title, isLoading } = p;

  if (isLoading) {
    return (
      <FlashingBox>
        <CircularProgress />
      </FlashingBox>
    );
  }

  return (
    <FlashingBox>
      <Typography>
        {title}: {value}
      </Typography>
    </FlashingBox>
  );
}

function Value1() {
  const { value, isLoading } = useStoreSlice(store, (s) => ({
    value: s.value1,
    isLoading: s.isLoading('setValue1'),
  }));

  return <Value title="Value 1" value={value} isLoading={isLoading} />;
}

function Value2() {
  const { value, isLoading } = useStoreSlice(store, (s) => ({
    value: s.value2,
    isLoading: s.isLoading('setValue2'),
  }));

  return <Value title="Value 2" value={value} isLoading={isLoading} />;
}

function Container() {
  return (
    <FlashingBox>
      <Box mt={1}>
        <Buttons />
        <Grid container spacing={1}>
          <Grid item md={6} xs={12}>
            <Value1 />
          </Grid>
          <Grid item md={6} xs={12}>
            <Value2 />
          </Grid>
        </Grid>
      </Box>
    </FlashingBox>
  );
}

function SliceView() {
  return (
    <FlashingBox>
      <Box>
        <Typography variant="h6">Slices</Typography>
        <Typography variant="caption">
          Each component is using only a slice of the state and is refreshed only if slice changed (flashing when is
          rendered)
        </Typography>
      </Box>
      <Container />
      <Container />
    </FlashingBox>
  );
}

export default SliceView;
