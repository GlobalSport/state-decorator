import React from 'react';
import { StateDecoratorActions, injectState } from '../../../src/StateDecorator';
import useCommonStyles from '../style.js';
import { Button } from '@material-ui/core';

type State = {
  count: number;
};

type Actions = {
  increment: (value: number) => void;
};

interface Props {
  value: number;
}

const actions: StateDecoratorActions<State, Actions, Props> = {
  increment: (s, [value]) => ({
    ...s,
    count: s.count + value,
  }),
};

export const WrappedComponentView = React.memo(function WrappedComponentView(props: Props & State & Actions) {
  const increment = () => props.increment(10);
  const commonClasses = useCommonStyles();

  const { count } = props;
  return (
    <div className={commonClasses.smallCardContainer}>
      <Button className={commonClasses.button} onClick={increment}>
        Increment
      </Button>
      <div className={commonClasses.smallCardValue}>{count}</div>
    </div>
  );
});

export default injectState(
  (props) => ({
    count: props.value || 0,
  }),
  actions
)(WrappedComponentView);
