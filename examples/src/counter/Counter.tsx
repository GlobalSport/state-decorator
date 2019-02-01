import React from 'react';
import StateDecorator, { StateDecoratorActions, injectState, LoadingProps } from '../../../src/StateDecorator';

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
class CounterView extends React.PureComponent<State & Actions> {
  render() {
    const { counter, increment, decrement } = this.props;
    return (
      <div>
        {counter}
        <button onClick={() => decrement(10)}>Substracts 10</button>
        <button onClick={() => increment(10)}>Adds 10</button>
      </div>
    );
  }
}

// Container that is managing the state.
export const CounterContainer = () => (
  <StateDecorator actions={actions} initialState={getInitialState()}>
    {(state, actions) => <CounterView {...state} {...actions} />}
  </StateDecorator>
);

export default injectState(getInitialState, actions)(CounterView);
