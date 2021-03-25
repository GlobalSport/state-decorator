import { createStore } from '../src';

function getTimeoutPromise<C>(timeout: number, result: C = null): Promise<C> {
  return new Promise((res) => {
    setTimeout(res, timeout, result);
  });
}

describe('Lifecycle', () => {
  describe('simple sync action', () => {
    type State = {
      prop: string;
    };

    type Action = {
      setProp: (p: string) => void;
    };

    it('Call store if not initialized ', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), {
        setProp: ({ s, args: [p] }) => ({ ...s, prop: p }),
      });

      store.actions.setProp('test');
    });

    it('Call store if destroyed ', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), {
        setProp: ({ s, args: [p] }) => ({ ...s, prop: p }),
      });

      store.init({});

      store.destroy();

      store.actions.setProp('test');
    });
  });

  describe('sync action', () => {
    type State = {
      prop: string;
    };

    type Action = {
      setProp: (p: string) => void;
    };
    it('Call store if not initialized', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), {
        setProp: {
          effects: ({ s, args: [p] }) => ({ ...s, prop: p }),
        },
      });

      store.actions.setProp('test');
    });

    it('Call store if destroyed', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), {
        setProp: {
          effects: ({ s, args: [p] }) => ({ ...s, prop: p }),
        },
      });

      store.init({});

      store.destroy();

      store.actions.setProp('test');

      store.loading;
      store.loadingMap;
      store.loadingParallelMap;
      store.state;
    });
  });

  describe('async action', () => {
    type State = {
      prop: string;
    };

    type Action = {
      setProp: (p: string) => void;
    };
    it('Call store if not initialized', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), {
        setProp: {
          getPromise: () => getTimeoutPromise(100, 'test'),
          effects: ({ s, args: [p] }) => ({ ...s, prop: p }),
        },
      });

      store.actions.setProp('test');
    });

    it('Call store if not destroyed', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), {
        setProp: {
          effects: ({ s, args: [p] }) => ({ ...s, prop: p }),
        },
      });

      store.init({});

      store.destroy();

      store.actions.setProp('test');
    });

    it('Call store if not destroyed after call', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), {
        setProp: {
          effects: ({ s, args: [p] }) => ({ ...s, prop: p }),
        },
      });

      store.init({});

      store.actions.setProp('test');

      store.destroy();
    });
  });

  describe('listeners', () => {
    type State = {
      prop: string;
    };

    type Action = {
      setProp: (p: string) => void;
    };

    it('listeners are registered before init', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), {
        setProp: ({ s, args: [p] }) => ({ ...s, prop: p }),
      });

      const callback = jest.fn();

      const unregister = store.addStateListener(() => {
        callback();
      });

      store.init({});

      store.actions.setProp('test');

      expect(callback).toHaveBeenCalledTimes(2);

      store.destroy();
    });

    it('listeners are unregistered on destroy', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), {
        setProp: ({ s, args: [p] }) => ({ ...s, prop: p }),
      });

      const callback = jest.fn(() => {
        debugger;
      });

      store.addStateListener(() => {
        callback();
      });

      store.init({});

      store.destroy();

      store.actions.setProp('test');

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('onMount is called on init', () => {
      const onMount = jest.fn();
      const store = createStore<State, Action, any>(
        () => ({ prop: '' }),
        {
          setProp: ({ s, args: [p] }) => ({ ...s, prop: p }),
        },
        {
          onMount,
        }
      );

      store.init({});

      expect(onMount).toHaveBeenCalled();

      store.destroy();
    });
  });
});