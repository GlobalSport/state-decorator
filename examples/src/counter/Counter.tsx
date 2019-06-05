import React from 'react';
import StateDecorator, { StateDecoratorActions, injectState, LoadingProps } from '../../../src/StateDecorator';
import Button from '@material-ui/core/Button';
import useCommonStyles from '../style.js';
import { makeStyles } from '@material-ui/styles';

const useLocalStyle = makeStyles({
  buttonRight: {
    marginLeft: 20
  }
})

type State = {
  counter: number;
};

type Actions = {
  increment: (incr: number) => void;
  decrement: (incr: number) => void;
};

export const getInitialState = (): State => ({
  counter: 0,
});

export const actions: StateDecoratorActions<State, Actions> = {
  decrement: (s, [incr]) => ({ counter: s.counter - incr }),
  increment: (s, [incr]) => ({ counter: s.counter + incr }),
};

// Stateless component, in real life use React.memo()
const CounterView = (props) => {
  const commonClasses = useCommonStyles();
  const localClasses = useLocalStyle();
  const { counter, increment, decrement } = props;

  return (
    <div className={commonClasses.smallCardContainer}>
      <Button className={commonClasses.button} onClick={() => increment(10)}>
        Adds 10
      </Button>
      <Button className={[commonClasses.button, localClasses.buttonRight].join(' ')} onClick={() => decrement(10)}>
        Subs 10
      </Button>
      <div className={commonClasses.smallCardValue}>Value: {counter}</div>
    </div>
  );
};

// Container that is managing the state.
export const CounterContainer = () => (
  <StateDecorator actions={actions} initialState={getInitialState()}>
    {(state, actions) => <CounterView {...state} {...actions} />}
  </StateDecorator>
);

export default injectState(getInitialState, actions)(CounterView);
