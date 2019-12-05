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

const actions: StateDecoratorActions<State, Actions> = {
  getItems: {
    promise: () => APIClient.getItems(),
    reducer: (s, list) => ({ ...s, list }),
  },
  addItem: {
    // As addItem is silly, we must reload the list after having added the item...
    promise: ([item], state, props, actions) => APIClient.addItem(item),
    // No reducer needed, the decorated action will call its reducer
    // onDone gathers side effects of the action
    onDone: (s, result, args, props, actions) => {
      actions.getItems();
    },
  },
};

export default function ChainContainer() {
  return (
    <StateDecorator actions={actions} getInitialState={getInitialState}>
      {(state, actions) => <div />}
    </StateDecorator>
  );
}
