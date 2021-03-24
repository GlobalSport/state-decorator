import React from 'react';
import { StateDecoratorActions, injectState } from '../../../src/StateDecorator';

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

export class WrappedComponentView extends React.PureComponent<State & Actions & Props> {
  increment = () => this.props.increment(10);

  render() {
    const { count } = this.props;
    return (
      <div>
        {count}
        <button onClick={this.increment}>Increment</button>
      </div>
    );
  }
}

export default injectState(
  (props) => ({
    count: props.value || 0,
  }),
  actions,
  { logEnabled: true }
)(WrappedComponentView);
