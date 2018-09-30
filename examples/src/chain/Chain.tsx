import React from 'react';
import StateDecorator, { StateDecoratorActions } from '../../../src/StateDecorator';

interface Item {
  id?: string;
  value: string;
}

export type State = {
  items: Item[];
};

export type Actions = {
  getItems: () => Promise<Item[]>;
  addItem: (item: Item) => Promise<any>;
};

export const getInitialState = (): State => ({
  items: [],
});

class APIClient {
  static getItems(): Promise<Item[]> {
    return Promise.resolve([]);
  }

  // addItem is silly and is not returning the created object!!
  static addItem(item: Item): Promise<any> {
    return Promise.resolve();
  }
}

export default class ChainContainer extends React.PureComponent<{}> {
  static actions: StateDecoratorActions<State, Actions> = {
    getItems: {
      promise: () => APIClient.getItems(),
      reducer: (s, list) => ({ ...s, list }),
    },
    addItem: {
      // As addItem is silly, we must reload the list after having added the item...
      promise: (item: Item, state, props, actions: Actions) => APIClient.addItem(item).then(() => actions.getItems()),
      // No reducer needed, the decorated action will call its reducer
    },
  };

  render() {
    return (
      <StateDecorator<State, Actions> actions={ChainContainer.actions} initialState={getInitialState()}>
        {(state, actions) => <div />}
      </StateDecorator>
    );
  }
}
