import { createStore } from '../src/index';
import { StoreActions } from '../src/types';

describe('Sync action', () => {
  type State = {
    prop1: string;
    prop2: number;
  };

  type Actions = {
    setProp1: (p: string) => void;
    setProp2: (p: number) => void;
    setCancelled: (p: number) => void;
  };

  const actions: StoreActions<State, Actions, any> = {
    setProp1: ({ args: [p] }) => ({ prop1: p }),
    setProp2: ({ args: [p] }) => ({ prop2: p }),
    setCancelled: () => null,
  };

  const getInitialState = (): State => ({
    prop1: '',
    prop2: 0,
  });

  it('can execute a regular sync action', () => {
    const store = createStore({ getInitialState, actions });
    const listener = jest.fn();
    store.addStateListener(listener);
    store.init(null);

    expect(store.state).toEqual({
      prop1: '',
      prop2: 0,
    });

    const { setProp1, setProp2, setCancelled } = store.actions;

    // init
    expect(listener).toHaveBeenCalledTimes(1);

    setProp1('coucou');

    expect(listener).toHaveBeenCalledTimes(2);

    expect(store.state).toEqual({
      prop1: 'coucou',
      prop2: 0,
    });

    setProp2(23);

    expect(listener).toHaveBeenCalledTimes(3);

    expect(store.state).toEqual({
      prop1: 'coucou',
      prop2: 23,
    });

    setCancelled(23);

    // not called
    expect(listener).toHaveBeenCalledTimes(3);

    expect(store.state).toEqual({
      prop1: 'coucou',
      prop2: 23,
    });
  });
});
