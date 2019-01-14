import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';

type State = number;

type Actions = {
  increment: (incr: number) => void;
  decrement: (incr: number) => void;
};

export const initialState: State = 0;

// Stateless component.
const CounterView: React.SFC<{ counter: number } & Actions> = ({ counter, increment, decrement }) => (
  <div>
    {counter}
    <button onClick={() => decrement(10)}>Substracts 10</button>
    <button onClick={() => increment(10)}>Adds 10</button>
  </div>
);

// Container that is managing the state.
export default class CounterContainer extends React.Component {
  static actions: StateDecoratorActions<State, Actions> = {
    decrement: (counter, [incr]) => counter - incr,
    increment: (counter, [incr]) => counter + incr,
  };

  render() {
    return (
      <StateDecorator<State, Actions> actions={CounterContainer.actions} initialState={initialState}>
        {(counter, actions) => {
          console.log(counter);
          return <CounterView counter={counter} {...actions} />;
        }}
      </StateDecorator>
    );
  }
}
