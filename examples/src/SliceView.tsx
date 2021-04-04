import React from 'react';

import { useStoreSlice } from '../../src';

import FlashingBox from './FlashingBox';
import { store } from './Slice';

import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

function Buttons() {
  const { actions } = useStoreSlice(store, ({ actions }) => ({ actions }));

  return (
    <FlashingBox>
      <Box>
        <Button variant="outlined" onClick={() => actions.setValue1('test1')}>
          Set Value 1 to "test1"
        </Button>
        <Button variant="outlined" onClick={() => actions.setValue2('test2')}>
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
  const { value, isLoading } = useStoreSlice(store, ({ s, isLoading }) => ({
    value: s.value1,
    isLoading: isLoading('setValue1'),
  }));

  return <Value title="Value 1" value={value} isLoading={isLoading} />;
}

function Value2() {
  const { value, isLoading } = useStoreSlice(store, ({ s, isLoading }) => ({
    value: s.value2,
    isLoading: isLoading('setValue2'),
  }));

  return <Value title="Value 2" value={value} isLoading={isLoading} />;
}

function SliceView() {
  const styles = useStyles({});
  return (
    <Box>
      <Typography variant="h6">Slices</Typography>
      <Typography variant="caption">
        Each component is using only a slice of the state and is refreshed only if slice changed (flashing when is
        rendered)
      </Typography>
      <Box mt={1}>
        <Buttons />
        <Grid container>
          <Grid item md={6} xs={12}>
            <Value1 />
          </Grid>
          <Grid item md={6} xs={12}>
            <Value2 />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

const useStyles = makeStyles((theme) => ({
  btn: {
    marginRight: theme.spacing(2),
  },
}));

export default SliceView;
