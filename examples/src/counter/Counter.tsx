import React from 'react';
import useStateDecorator, { StateDecoratorActions, useOnMount, useOnUnmount, useOnUnload } from '../../../src/index';

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

export const actionsImpl: StateDecoratorActions<State, Actions> = {
  decrement: (s, [incr]) => ({ counter: s.counter - incr }),
  increment: (s, [incr]) => ({ counter: s.counter + incr }),
};

// Stateless component
// Separate container from view to test more easily the view.
const CounterView = React.memo(function CounterView(props: State & Actions) {
  const { counter, increment, decrement } = props;
  return (
    <div>
      {counter}
      <button onClick={() => decrement(10)}>Substracts 10</button>
      <button onClick={() => increment(10)}>Adds 10</button>
    </div>
  );
});

// Container that is managing the state using usetateDecorator hook
const CounterContainer = () => {
  const { state, actions } = useStateDecorator(getInitialState, actionsImpl);
  useOnMount(() => {
    actions.increment(10);
  });
  return <CounterView {...state} {...actions} />;
};

export default CounterContainer;
