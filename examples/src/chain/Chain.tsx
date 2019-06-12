import React from 'react';
import useStateDecorator, { StateDecoratorActions } from '../../../src';

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

const actionsImpl: StateDecoratorActions<State, Actions> = {
  getItems: {
    promise: () => APIClient.getItems(),
    reducer: (s, list) => ({ ...s, list }),
  },
  addItem: {
    // As addItem is silly, we must reload the list after having added the item...
    promise: ([item], state, props, actions) => APIClient.addItem(item).then(() => actions.getItems()),
    // No reducer needed, the decorated action will call its reducer
  },
};

const View = (p: State & Actions) => <div />;

export default function ChainContainer() {
  const { state, actions } = useStateDecorator(getInitialState, actionsImpl);
  return <View {...state} {...actions} />;
}
