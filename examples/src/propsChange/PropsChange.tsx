import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';

export type State = {
  value: string;
};

export type Actions = {
  get: (param: string) => Promise<any>;
};

export const getInitialState = (): State => ({
  value: 'initial value',
});

type PropsChangeProps = { value: string };

// State decorator managed class that depends on value from props.
export class PropsChange extends React.PureComponent<PropsChangeProps> {
  static actions: StateDecoratorActions<State, Actions> = {
    get: {
      promise: ([param]) => new Promise((resolve) => setTimeout(resolve, 1000, param)),
      reducer: (s, param) => {
        return { ...s, value: param };
      },
    },
  };

  render() {
    return (
      <StateDecorator<State, Actions, PropsChangeProps>
        actions={PropsChange.actions}
        initialState={getInitialState()}
        props={this.props}
        getPropsRefValues={(p) => [p.value]}
        onPropsChangeReducer={(s, p) => ({ ...s, value: p.value })}
        onPropsChange={(s, p, actions) => actions.get('value 3')}
        logEnabled
      >
        {({ value }) => <div>value: {value}</div>}
      </StateDecorator>
    );
  }
}

export interface PropsChangeAppProps {}

export default class PropsChangeApp extends React.PureComponent<PropsChangeAppProps> {
  state = {
    value: 'value',
  };

  render() {
    return (
      <div>
        <h1>Props change</h1>
        <div>A state decorator can update its state from its props</div>
        <div>Click on button change the StateDecorator property</div>
        <br />
        <PropsChange value={this.state.value} />
        <br />
        <button onClick={() => this.setState({ value: 'value 2' })}>Update value</button>
      </div>
    );
  }
}
