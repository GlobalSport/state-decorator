import { createStore, StoreActions, StoreConfig, StoreOptions } from '../src';
import { setArgIn } from '../src/helpers';

import Graph from '../src/graph';

describe('Derived state', () => {
  type State = {
    other: number | null;
    filter: string | null;
    list: string[];
  };

  type DerivedState = {
    filteredList: string[];
    filteredListProps: string[];
  };

  type Props = {
    filterIn: string | null;
    otherProp: string | null;
    effectProp: number | null;
    checkDS: (ds: DerivedState) => void;
  };

  type Actions = {
    setList: (list: string[]) => void;
    setListSideEffects: (list: string[]) => Promise<any>;
    setListDebouncedSideEffects: (list: string[]) => Promise<any>;
    setAsyncListSideEffects: (list: string[]) => Promise<any>;
    setAsyncErrorListSideEffects: (list: string[]) => Promise<any>;
    setFilter: (filter: string) => void;
    setOther: (p: number) => void;
  };

  const actionsImpl: StoreActions<State, Actions, Props, DerivedState> = {
    setList: ({ args: [list], ds }) => {
      expect(ds).toBeDefined();
      return { list };
    },
    setFilter: ({ ds, args: [filter] }) => {
      expect(ds).toBeDefined();
      return { filter };
    },
    setOther: ({ args: [other] }) => ({ other }),
    setListSideEffects: {
      effects: ({ args: [list], ds }) => {
        expect(ds).toBeDefined();
        return { list };
      },
      sideEffects: ({ ds, p }) => {
        expect(ds).toBeDefined();
        p.checkDS(ds);
      },
    },
    setListDebouncedSideEffects: {
      effects: ({ args: [list], ds }) => {
        expect(ds).toBeDefined();
        return { list };
      },
      debounceSideEffectsTimeout: 10,
      sideEffects: ({ ds, p }) => {
        expect(ds).toBeDefined();
        p.checkDS(ds);
      },
    },
    setAsyncListSideEffects: {
      getPromise: () => Promise.resolve(),
      effects: ({ args: [list], ds }) => {
        expect(ds).toBeDefined();
        return { list };
      },
      sideEffects: ({ ds, p }) => {
        expect(ds).toBeDefined();
        p.checkDS(ds);
      },
    },
    setAsyncErrorListSideEffects: {
      getPromise: () => Promise.reject(),
      errorEffects: ({ args: [list], ds }) => {
        expect(ds).toBeDefined();
        return { list };
      },
      errorSideEffects: ({ ds, p }) => {
        expect(ds).toBeDefined();
        p.checkDS(ds);
      },
    },
  };

  const getInitialState = (): State => ({
    list: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
    filter: null,
    other: 0,
  });

  const options: StoreOptions<State, Actions, Props, DerivedState> = {
    derivedState: {
      filteredList: {
        getDeps: ({ s }) => [s.filter, s.list],
        get: ({ s }) => (s.filter === null ? s.list : s.list.filter((item) => item.indexOf(s.filter) !== -1)),
      },
      filteredListProps: {
        getDeps: ({ s, p }) => [p.filterIn, s.list],
        get: ({ s, p }) => (p.filterIn === null ? s.list : s.list.filter((item) => item.indexOf(p.filterIn) !== -1)),
      },
    },
  };

  it('computes derived state correctly from state', () => {
    const store = createStore<State, Actions, Props, DerivedState>({
      getInitialState,
      actions: actionsImpl,
      ...options,
    });
    const listener = jest.fn();
    store.addStateListener(listener);
    store.init({
      filterIn: null,
      otherProp: null,
      effectProp: null,
      checkDS: () => {},
    });

    expect(store.state).toEqual({
      filter: null,
      list: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredList: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredListProps: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      other: 0,
    });

    expect(store.state.filteredList).toBe(store.state.list);

    const { setFilter, setList, setOther } = store.actions;

    // init
    expect(listener).toHaveBeenCalledTimes(1);

    setFilter('aaa');

    expect(listener).toHaveBeenCalledTimes(2);

    expect(store.state).toEqual({
      list: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredList: ['aaa1', 'aaa2', 'aaa3'],
      filteredListProps: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filter: 'aaa',
      other: 0,
    });

    setList(['bbb1', 'aaa3']);

    expect(listener).toHaveBeenCalledTimes(3);

    expect(store.state).toEqual({
      list: ['bbb1', 'aaa3'],
      filter: 'aaa',
      filteredList: ['aaa3'],
      filteredListProps: ['bbb1', 'aaa3'],
      other: 0,
    });

    const savedList = store.state.filteredList;
    expect(savedList).toEqual(['aaa3']);

    setOther(2);

    expect(listener).toHaveBeenCalledTimes(4);

    expect(store.state).toEqual({
      list: ['bbb1', 'aaa3'],
      filter: 'aaa',
      filteredList: ['aaa3'],
      filteredListProps: ['bbb1', 'aaa3'],
      other: 2,
    });

    expect(store.state.filteredList).toBe(savedList);
  });

  it('computes derived state correctly from props', () => {
    const store = createStore<State, Actions, Props, DerivedState>({
      getInitialState,
      actions: actionsImpl,
      ...options,
    });
    const listener = jest.fn();
    store.addStateListener(listener);
    store.init({
      filterIn: null,
      otherProp: null,
      effectProp: null,
      checkDS: () => {},
    });

    expect(store.state).toEqual({
      list: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredList: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredListProps: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filter: null,
      other: 0,
    });

    expect(store.state.filteredList).toBe(store.state.list);

    const { setFilter, setList, setOther } = store.actions;

    // init
    expect(listener).toHaveBeenCalledTimes(1);

    store.setProps({
      filterIn: 'aaa',
      otherProp: null,
      effectProp: null,
      checkDS: () => {},
    });

    expect(listener).toHaveBeenCalledTimes(2);

    expect(store.state).toEqual({
      list: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredList: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredListProps: ['aaa1', 'aaa2', 'aaa3'],
      filter: null,
      other: 0,
    });

    setList(['bbb1', 'aaa3']);

    expect(listener).toHaveBeenCalledTimes(3);

    expect(store.state).toEqual({
      list: ['bbb1', 'aaa3'],
      filter: null,
      filteredList: ['bbb1', 'aaa3'],
      filteredListProps: ['aaa3'],
      other: 0,
    });

    const savedList = store.state.filteredListProps;
    expect(savedList).toEqual(['aaa3']);

    store.setProps({
      filterIn: 'aaa',
      otherProp: 'NEW',
      effectProp: null,
      checkDS: () => {},
    });

    expect(listener).toHaveBeenCalledTimes(3);

    expect(store.state).toEqual({
      list: ['bbb1', 'aaa3'],
      filter: null,
      filteredList: ['bbb1', 'aaa3'],
      filteredListProps: ['aaa3'],
      other: 0,
    });

    expect(store.state.filteredListProps).toBe(savedList);
  });

  it('provides correct derived state in derived state', () => {
    const store = createStore<State, Actions, Props, DerivedState>({
      getInitialState,
      actions: actionsImpl,
      ...options,
    });
    const listener = jest.fn();
    store.addStateListener(listener);
    store.init({
      filterIn: null,
      otherProp: null,
      effectProp: null,
      checkDS: (ds: DerivedState) => {
        expect(ds.filteredList).toEqual(['aaa1']);
      },
    });

    expect(store.state).toEqual({
      filter: null,
      list: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredList: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredListProps: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      other: 0,
    });

    store.actions.setListSideEffects(['aaa1']);
    expect(store.state.filteredList).toEqual(['aaa1']);
  });

  it('provides correct derived state in derived state', (done) => {
    const store = createStore<State, Actions, Props, DerivedState>({
      getInitialState,
      actions: actionsImpl,
      ...options,
    });
    const listener = jest.fn();
    store.addStateListener(listener);
    store.init({
      filterIn: null,
      otherProp: null,
      effectProp: null,
      checkDS: (ds: DerivedState) => {
        expect(ds.filteredList).toEqual(['aaa1']);
      },
    });

    expect(store.state).toEqual({
      filter: null,
      list: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredList: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredListProps: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      other: 0,
    });

    store.actions.setListDebouncedSideEffects(['aaa1']);

    setTimeout(() => {
      expect(store.state.filteredList).toEqual(['aaa1']);
      done();
    }, 200);
  });

  it('provides correct derived state in derived state (async)', async () => {
    const store = createStore<State, Actions, Props, DerivedState>({
      getInitialState,
      actions: actionsImpl,
      ...options,
    });
    const listener = jest.fn();
    store.addStateListener(listener);
    store.init({
      filterIn: null,
      otherProp: null,
      effectProp: null,
      checkDS: (ds: DerivedState) => {
        expect(ds.filteredList).toEqual(['aaa1']);
      },
    });

    expect(store.state).toEqual({
      filter: null,
      list: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredList: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredListProps: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      other: 0,
    });

    await store.actions.setAsyncListSideEffects(['aaa1']);
    expect(store.state.filteredList).toEqual(['aaa1']);
  });

  it('provides correct derived state in derived state (async, error)', async () => {
    const store = createStore<State, Actions, Props, DerivedState>({
      getInitialState,
      actions: actionsImpl,
      ...options,
    });
    const listener = jest.fn();
    store.addStateListener(listener);
    store.init({
      filterIn: null,
      otherProp: null,
      effectProp: null,
      checkDS: (ds: DerivedState) => {
        expect(ds.filteredList).toEqual(['aaa1']);
      },
    });

    expect(store.state).toEqual({
      filter: null,
      list: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredList: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredListProps: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      other: 0,
    });

    await store.actions.setAsyncErrorListSideEffects(['aaa1']);
    expect(store.state.filteredList).toEqual(['aaa1']);
  });

  it('computes derived state correctly from props (with onPropsChange)', () => {
    const store = createStore<State, Actions, Props, DerivedState>({
      getInitialState,
      actions: actionsImpl,
      ...options,
      onPropsChange: {
        getDeps: (p) => [p.filterIn, p.effectProp],
        effects: ({ p }) => ({ filter: p.filterIn, other: p.effectProp }),
      },
    });
    const listener = jest.fn();
    store.addStateListener(listener);
    store.init({
      filterIn: null,
      otherProp: null,
      effectProp: null,
      checkDS: () => {},
    });

    expect(store.state).toEqual({
      list: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredList: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filteredListProps: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filter: null,
      other: 0,
    });

    expect(store.state.filteredList).toBe(store.state.list);

    const { setList } = store.actions;

    // init
    expect(listener).toHaveBeenCalledTimes(1);

    store.setProps({
      filterIn: 'aaa',
      otherProp: null,
      effectProp: null,
      checkDS: () => {},
    });

    expect(listener).toHaveBeenCalledTimes(2);

    // check that filter was updated (onPropChange effect)
    expect(store.state).toEqual({
      list: ['aaa1', 'bbb1', 'ccc1', 'aaa2', 'aaa3', 'bbb2'],
      filter: 'aaa',
      // check that both derived values were computed
      filteredList: ['aaa1', 'aaa2', 'aaa3'],
      filteredListProps: ['aaa1', 'aaa2', 'aaa3'],
      other: null,
    });

    setList(['bbb1', 'aaa3']);

    expect(listener).toHaveBeenCalledTimes(3);

    expect(store.state).toEqual({
      list: ['bbb1', 'aaa3'],
      filter: 'aaa',
      filteredList: ['aaa3'],
      filteredListProps: ['aaa3'],
      other: null,
    });

    const savedList = store.state.filteredListProps;
    expect(savedList).toEqual(['aaa3']);

    store.setProps({
      filterIn: 'aaa',
      otherProp: 'NEW',
      effectProp: null,
      checkDS: () => {},
    });

    // other prop is not in effect deps nor derived value deps => no notification
    expect(listener).toHaveBeenCalledTimes(3);

    expect(store.state).toEqual({
      list: ['bbb1', 'aaa3'],
      filter: 'aaa',
      filteredList: ['aaa3'],
      filteredListProps: ['aaa3'],
      other: null,
    });

    expect(store.state.filteredListProps).toBe(savedList);

    store.setProps({
      filterIn: 'aaa',
      otherProp: 'NEW',
      effectProp: 42,
      checkDS: () => {},
    });

    // effect => state change
    expect(listener).toHaveBeenCalledTimes(4);

    expect(store.state).toEqual({
      list: ['bbb1', 'aaa3'],
      filter: 'aaa',
      filteredList: ['aaa3'],
      filteredListProps: ['aaa3'],
      other: 42,
    });

    // but no derived state change
    expect(store.state.filteredListProps).toBe(savedList);
  });
});

describe('Use derived state to compute derived state', () => {
  it('initial use case', () => {
    type State = {
      value: string;
    };

    type DerivedState = {
      derived1: string;
      derived2: string;
    };

    type Actions = {
      setValue: (v: string) => void;
    };

    const getInitialState: () => State = () => ({ value: 'init' });
    const storeActions: StoreActions<State, Actions, {}, DerivedState> = {
      setValue: ({ s, args: [v] }) => ({ ...s, value: v }),
    };

    const storeOptions: StoreOptions<State, Actions, {}, DerivedState> = {
      derivedState: {
        derived1: {
          getDeps: ({ s }) => [s.value],
          get: ({ s }) => `${s.value}_derived`,
        },
        derived2: {
          getDeps: ({ s }) => [s.value],
          get: ({ ds }) => `${ds.derived1}_derived`,
        },
      },
    };

    const store = createStore({ getInitialState, actions: storeActions, ...storeOptions });
    store.init({});

    const {
      state,
      actions: { setValue },
    } = store;

    expect(state.value).toEqual('init');
    expect(state.derived1).toEqual('init_derived');
    expect(state.derived2).toEqual('init_derived_derived');

    setValue('value');

    const newState = store.state;

    expect(newState.value).toEqual('value');
    expect(newState.derived1).toEqual('value_derived');
    expect(newState.derived2).toEqual('value_derived_derived');
  });

  it('bad order use case but deps allow to order', () => {
    type State = {
      value: string;
    };

    type DerivedState = {
      derived1: string;
      derived2: string;
    };

    type Actions = {
      setValue: (v: string) => void;
    };

    const getInitialState: () => State = () => ({ value: 'init' });
    const storeActions: StoreActions<State, Actions, {}, DerivedState> = {
      setValue: ({ s, args: [v] }) => ({ ...s, value: v }),
    };

    const storeOptions: StoreOptions<State, Actions, {}, DerivedState> = {
      derivedState: {
        // derived2 depends on derived1 => it must be defined first
        derived2: {
          get: ({ ds }) => `${ds.derived1}_derived2`,
          derivedDeps: ['derived1'],
        },
        derived1: {
          getDeps: ({ s }) => [s.value],
          get: ({ s }) => `${s.value}_derived1`,
        },
      },
    };

    const store = createStore({ getInitialState, actions: storeActions, ...storeOptions });
    store.init({});

    const {
      state,
      actions: { setValue },
    } = store;

    expect(state.value).toEqual('init');
    expect(state.derived1).toEqual('init_derived1');
    expect(state.derived2).toEqual('init_derived1_derived2');

    setValue('value');

    const newState = store.state;

    expect(newState.value).toEqual('value');
    expect(newState.derived1).toEqual('value_derived1');
    expect(newState.derived2).toEqual('value_derived1_derived2');
  });

  it('dependency circular dependency', () => {
    type State = {
      value: string;
    };

    type DerivedState = {
      derived1: string;
      derived2: string;
      derived3: string;
    };

    type Actions = {
      setValue: (v: string) => void;
    };

    const getInitialState: () => State = () => ({ value: 'init' });
    const storeActions: StoreActions<State, Actions, {}, DerivedState> = {
      setValue: ({ s, args: [v] }) => ({ ...s, value: v }),
    };

    const storeOptions: StoreOptions<State, Actions, {}, DerivedState> = {
      derivedState: {
        derived3: {
          get: ({ ds }) => `${ds.derived2}_derived3`,
          derivedDeps: ['derived2'],
        },
        derived2: {
          get: ({ ds }) => `${ds.derived1}_derived2`,
          derivedDeps: ['derived1'],
        },
        derived1: {
          getDeps: ({ s }) => [s.value],
          get: ({ s }) => `${s.value}_derived1`,
          derivedDeps: ['derived3'],
        },
      },
    };

    try {
      const store = createStore(getInitialState, storeActions, storeOptions);
      store.init({});
      throw new Error('unexpected');
    } catch (e) {
      // expected error of circular dependency
      if (e.message === 'unexpected') {
        throw new Error('unexpected');
      }
    }
  });
});

describe('Graph', () => {
  it('cyclic', () => {
    const graph = new Graph(['derive1', 'derived2', 'derived3', 'derived4']);
    graph.setEdges('derived3', ['derived2']);
    graph.setEdges('derived2', ['derived1']);
    graph.setEdges('derived1', ['derived3']);

    expect(graph.isCyclic()).toBeTruthy();
  });

  it('not cyclic', () => {
    const graph = new Graph(['derive1', 'derived2', 'derived3', 'derived4']);
    graph.setEdges('derived3', ['derived2']);
    graph.setEdges('derived2', ['derived1']);

    expect(graph.isCyclic()).toBeFalsy();
  });
});

describe('Issues', () => {
  it('null => undefined', () => {
    type State = {
      value1: string | null;
    };

    type Props = {
      prop1: any;
      prop2: any;
    };

    type DerivedState = {
      derived1: string;
    };

    type Actions = {
      setValue: (v: string) => void;
    };

    const config: StoreConfig<State, Actions, Props, DerivedState> = {
      initialState: {
        value1: null,
      },
      actions: {
        setValue: setArgIn('value1'),
      },
      derivedState: {
        derived1: {
          getDeps: ({ s, p }) => [p.prop1, p.prop2],
          get: ({ s }) => '' + s.value1,
        },
      },
    };

    const store = createStore(config);

    store.init({
      prop1: null,
      prop2: 'init',
    });

    const listener = jest.fn();

    store.addStateListener(listener);

    store.setProps({
      prop1: undefined,
      prop2: 'changed',
    });

    expect(listener).toHaveBeenCalled();
  });

  describe('null tests', () => {
    type State = {
      prop: string | null;
    };

    type Actions = {
      setProp: (v: string | null) => void;
    };

    type Props = Record<string, never>;

    type DerivedState = {
      derived: string | null;
    };

    const storeConfig: StoreConfig<State, Actions, Props, DerivedState> = {
      getInitialState: () => ({ prop: null }),
      actions: {
        setProp: setArgIn('prop'),
      },
      derivedState: {
        derived: {
          getDeps: ({ s }) => [s.prop],
          get: ({ s }) => (s.prop ? `${s.prop}_derived` : null),
        },
      },
    };

    it('computes derived state null => not null', () => {
      const store = createStore({
        ...storeConfig,
        getInitialState: () => ({ prop: null }),
      });
      store.init({});

      expect(store.state).toEqual({
        prop: null,
        derived: null,
      });

      store.actions.setProp('value');

      expect(store.state).toEqual({
        prop: 'value',
        derived: 'value_derived',
      });
    });

    it('computes derived state not null => null', () => {
      const store = createStore({
        ...storeConfig,
        getInitialState: () => ({ prop: 'value' }),
      });

      store.init({});

      expect(store.state).toEqual({
        prop: 'value',
        derived: 'value_derived',
      });

      store.actions.setProp(null);

      expect(store.state).toEqual({
        prop: null,
        derived: null,
      });
    });
  });
});
