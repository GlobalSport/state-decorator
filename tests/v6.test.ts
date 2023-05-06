import { StoreConfig, createStore } from '../src';

describe('fullStateEffects', () => {
  type State = {
    prop1: string;
    prop2: number;
  };

  type Actions = {
    setProp1: (p: string) => void;
  };

  const config: StoreConfig<State, Actions> = {
    initialState: {
      prop1: '',
      prop2: 0,
    },
    actions: {
      setProp1: { effects: ({ s, args: [p] }) => ({ ...s, prop1: p }) },
    },
    fullStateEffects: true,
  };

  const store = createStore(config);
  store.init({});

  it('works as expected', () => {
    store.actions.setProp1('p1');
    const { state } = store;
    expect(state).toEqual({
      prop1: 'p1',
      prop2: 0,
    });
  });
});
