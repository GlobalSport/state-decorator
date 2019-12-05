import React from 'react';
import StateDecorator, { StateDecoratorActions, LoadingProps } from '../../../src/StateDecorator';

type State = {};
type Actions = {
  loadList: (arg1: any, arg2: any) => Promise<any[]>;
};
type Props = {};

function getInitialState(): State {
  return {
    list: [],
  };
}

const actions: StateDecoratorActions<State, Actions, Props> = {
  loadList: {
    promise: ([arg1, arg2], state, props, actions) =>
      new Promise((resolve) => setTimeout(resolve, 500, ['hello', 'world'])),
    reducer: (state, result, args, props) => ({ ...state, list: result }),
  },
};

function onMount(actions: Actions) {
  actions.loadList('arg1', 'arg2');
}

function onUnmount(s: State) {
  localStorage.setItem('state', JSON.stringify(s));
}

export default function MyContainer() {
  return (
    <StateDecorator actions={actions} onMount={onMount} onUnmount={onUnmount} getInitialState={getInitialState}>
      {(state, actions, loading) => <MyView {...state} {...actions} loading={loading} />}
    </StateDecorator>
  );
}

const MyView = (p: State & Actions & Pick<LoadingProps<Actions>, 'loading'>) => <div />;
