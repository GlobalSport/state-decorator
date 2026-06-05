import { createStore } from '../src/index';

describe('listenToStoreProps', () => {
  type DepState = {
    count: number;
    label: string;
    unrelated: boolean;
  };

  type DepActions = {
    setCount: (n: number) => void;
    setLabel: (s: string) => void;
    setUnrelated: (b: boolean) => void;
  };

  type MainState = {
    value: string;
  };

  type MainActions = {
    setValue: (v: string) => void;
  };

  type MainProps = {
    count: number;
    label: string;
  };

  function makeDepStore() {
    const store = createStore<DepState, DepActions, {}>({
      getInitialState: () => ({ count: 0, label: 'hello', unrelated: false }),
      actions: {
        setCount: ({ args: [n] }) => ({ count: n }),
        setLabel: ({ args: [s] }) => ({ label: s }),
        setUnrelated: ({ args: [b] }) => ({ unrelated: b }),
      },
    });
    store.init({});
    return store;
  }

  function makeMainStore(initialProps: MainProps = { count: 0, label: 'hello' }) {
    const store = createStore<MainState, MainActions, MainProps>({
      getInitialState: (p) => ({ value: `${p.count}-${p.label}` }),
      actions: {
        setValue: ({ args: [v] }) => ({ value: v }),
      },
      onPropsChange: {
        getDeps: (p) => [p.count, p.label],
        effects: ({ p }) => ({ value: `${p.count}-${p.label}` }),
      },
    });
    store.init(initialProps);
    return store;
  }

  it('calls setProps when a watched prop changes in depStore', () => {
    const depStore = makeDepStore();
    const mainStore = makeMainStore();

    const unregister = mainStore.listenToStoreProps(depStore, ['count']);

    depStore.actions.setCount(42);

    expect(mainStore.state.value).toBe('42-hello');

    unregister();
  });

  it('does not call setProps when a non-watched prop changes in depStore', () => {
    const depStore = makeDepStore();
    const mainStore = makeMainStore();

    const setProps = jest.spyOn(mainStore, 'setProps');

    const unregister = mainStore.listenToStoreProps(depStore, ['count']);

    depStore.actions.setUnrelated(true);

    expect(setProps).not.toHaveBeenCalled();

    unregister();
  });

  it('stops propagating changes after unregister is called', () => {
    const depStore = makeDepStore();
    const mainStore = makeMainStore();

    const unregister = mainStore.listenToStoreProps(depStore, ['count']);

    depStore.actions.setCount(10);
    expect(mainStore.state.value).toBe('10-hello');

    unregister();

    depStore.actions.setCount(99);
    expect(mainStore.state.value).toBe('10-hello');
  });

  it('triggers update when any one of multiple watched props changes', () => {
    const depStore = makeDepStore();
    const mainStore = makeMainStore();

    const unregister = mainStore.listenToStoreProps(depStore, ['count', 'label']);

    depStore.actions.setLabel('world');
    expect(mainStore.state.value).toBe('0-world');

    depStore.actions.setCount(5);
    expect(mainStore.state.value).toBe('5-world');

    unregister();
  });

  it('merges changed props with existing current props', () => {
    const depStore = makeDepStore();
    const mainStore = makeMainStore({ count: 1, label: 'init' });

    const unregister = mainStore.listenToStoreProps(depStore, ['count']);

    // only count is watched; label in mainStore props should remain 'init'
    depStore.actions.setCount(7);
    expect(mainStore.state.value).toBe('7-init');

    unregister();
  });

  it('handles depStore not yet initialized (null state) gracefully', () => {
    const depStore = createStore<DepState, DepActions, {}>({
      getInitialState: () => ({ count: 0, label: 'hello', unrelated: false }),
      actions: {
        setCount: ({ args: [n] }) => ({ count: n }),
        setLabel: ({ args: [s] }) => ({ label: s }),
        setUnrelated: ({ args: [b] }) => ({ unrelated: b }),
      },
    });
    // depStore is NOT initialized (no init() call)

    const mainStore = makeMainStore();

    // Should not throw even if depStore.state is null
    expect(() => {
      const unregister = mainStore.listenToStoreProps(depStore, ['count']);
      unregister();
    }).not.toThrow();
  });
});
