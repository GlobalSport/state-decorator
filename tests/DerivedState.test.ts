import { createStore, StoreActions, StoreOptions } from '../src/index';

import Graph from '../src/graph';

describe('Derived state', () => {
  type State = {
    other: number;
    filter: string;
    list: string[];
  };

  type DerivedState = {
    filteredList: string[];
    filteredListProps: string[];
  };

  type Props = {
    filterIn: string;
    otherProp: string;
    effectProp: number;
    checkDS: (ds: DerivedState) => void;
  };

  type Actions = {
    setList: (list: string[]) => void;
    setListSideEffects: (list: string[]) => void;
    setListDebouncedSideEffects: (list: string[]) => void;
    setAsyncListSideEffects: (list: string[]) => void;
    setAsyncErrorListSideEffects: (list: string[]) => void;
    setFilter: (filter: string) => void;
    setOther: (p: number) => void;
  };

  const actionsImpl: StoreActions<State, Actions, any, DerivedState> = {
    setList: ({ s, args: [list], ds }) => {
      expect(ds).toBeDefined();
      return { ...s, list };
    },
    setFilter: ({ s, ds, args: [filter] }) => {
      expect(ds).toBeDefined();
      return { ...s, filter };
    },
    setOther: ({ s, args: [other] }) => ({ ...s, other }),
    setListSideEffects: {
      effects: ({ s, args: [list], ds }) => {
        expect(ds).toBeDefined();
        return { ...s, list };
      },
      sideEffects: ({ ds, p }) => {
        expect(ds).toBeDefined();
        p.checkDS(ds);
      },
    },
    setListDebouncedSideEffects: {
      effects: ({ s, args: [list], ds }) => {
        expect(ds).toBeDefined();
        return { ...s, list };
      },
      debounceSideEffectsTimeout: 10,
      sideEffects: ({ ds, p }) => {
        expect(ds).toBeDefined();
        p.checkDS(ds);
      },
    },
    setAsyncListSideEffects: {
      getPromise: () => Promise.resolve(),
      effects: ({ s, args: [list], ds }) => {
        expect(ds).toBeDefined();
        return { ...s, list };
      },
      sideEffects: ({ ds, p }) => {
        expect(ds).toBeDefined();
        p.checkDS(ds);
      },
    },
    setAsyncErrorListSideEffects: {
      getPromise: () => Promise.reject(),
      errorEffects: ({ s, args: [list], ds }) => {
        expect(ds).toBeDefined();
        return { ...s, list };
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
    const store = createStore(getInitialState, actionsImpl, options);
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
    const store = createStore(getInitialState, actionsImpl, options);
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
    const store = createStore(getInitialState, actionsImpl, options);
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
    const store = createStore(getInitialState, actionsImpl, options);
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
    const store = createStore(getInitialState, actionsImpl, options);
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
    const store = createStore(getInitialState, actionsImpl, options);
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
    const options2: StoreOptions<State, Actions, Props, DerivedState> = {
      ...options,
      onPropsChange: {
        getDeps: (p) => [p.filterIn, p.effectProp],
        effects: ({ s, p }) => ({ ...s, filter: p.filterIn, other: p.effectProp }),
      },
    };

    const store = createStore(getInitialState, actionsImpl, options2);
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

    const store = createStore(getInitialState, storeActions, storeOptions);
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

    const store = createStore(getInitialState, storeActions, storeOptions);
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
