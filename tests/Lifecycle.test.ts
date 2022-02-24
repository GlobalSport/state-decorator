import { ConflictPolicy, createStore, StoreActions, StoreOptions } from '../src';

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
        setProp: ({ args: [p] }) => ({ prop: p }),
      });

      store.actions.setProp('test');
    });

    it('Call store if destroyed ', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), {
        setProp: ({ args: [p] }) => ({ prop: p }),
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
          effects: ({ args: [p] }) => ({ prop: p }),
        },
      });

      store.actions.setProp('test');
    });

    it('Call store if destroyed', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), {
        setProp: {
          effects: ({ args: [p] }) => ({ prop: p }),
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
      setPropSimpleSync: (p: string) => void;
      setPropSync: (p: string) => void;
      setPropAsync: (p: string) => void;
    };

    const actionsImpl: StoreActions<State, Action> = {
      setPropSync: { effects: ({ s, args: [p] }) => ({ prop: p + s.prop }) },
      setPropSimpleSync: ({ s, args: [p] }) => ({ prop: p + s.prop }),
      setPropAsync: {
        getPromise: () => getTimeoutPromise(100, 'test'),
        effects: ({ s, args: [p] }) => ({ prop: p + s.prop }),
      },
    };

    it('Call store if not initialized (async)', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), actionsImpl);

      store.actions.setPropAsync('test');
    });

    it('Call store if not initialized (sync)', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), actionsImpl);

      store.actions.setPropSync('test');
    });

    it('Call store if not initialized (simple sync)', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), actionsImpl);

      store.actions.setPropSimpleSync('test');
    });

    it('Call store if destroyed (asynchronous)', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), actionsImpl);

      store.init({});

      store.destroy();

      store.actions.setPropAsync('test');
    });
    it('Call store if destroyed (sync)', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), actionsImpl);

      store.init({});

      store.destroy();

      store.actions.setPropSync('test');
    });
    it('Call store if destroyed (simple sync)', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), actionsImpl);

      store.init({});

      store.destroy();

      store.actions.setPropSimpleSync('test');
    });

    it('Call store if not destroyed after call', () => {
      const store = createStore<State, Action, any>(() => ({ prop: '' }), actionsImpl);

      store.init({});

      store.actions.setPropAsync('test');

      store.destroy();
    });

    it('Ongoing abortable actions are automatically aborted', (done) => {
      type State = {
        value: number | null;
      };

      type Actions = {
        onLoad: () => void;
        onLoadAbortable: () => Promise<number>;
        onLoadAbortableParallel: (id: string) => Promise<number>;
      };

      const mockAbort = jest.fn();

      const storeActions: StoreActions<State, Actions> = {
        onLoad: {
          getPromise: () => getTimeoutPromise(100, 1),
        },
        onLoadAbortable: {
          abortable: true,
          getPromise: ({ abortSignal }) =>
            new Promise((resolve, reject) => {
              const timeout = window.setTimeout(resolve, 2500, 1);
              abortSignal.addEventListener('abort', () => {
                mockAbort();
                window.clearTimeout(timeout);
                reject(new DOMException('Aborted', 'AbortError'));
              });
            }),
          effects: ({ s, res: v }) => ({ ...s, value: v }),
        },
        onLoadAbortableParallel: {
          abortable: true,
          conflictPolicy: ConflictPolicy.PARALLEL,
          getPromiseId: (id) => id,
          getPromise: ({ abortSignal }) =>
            new Promise((resolve, reject) => {
              const timeout = window.setTimeout(resolve, 2500, 1);
              abortSignal.addEventListener('abort', () => {
                mockAbort();
                window.clearTimeout(timeout);
                reject(new DOMException('Aborted', 'AbortError'));
              });
            }),
          effects: ({ s, res: v }) => ({ ...s, value: v }),
        },
      };

      function getInitialState(): State {
        return {
          value: null,
        };
      }

      const storeOptions: StoreOptions<State, Actions> = {
        onUnmount: ({ abortedActions }) => {
          try {
            expect(mockAbort).toHaveBeenCalled();
            expect(abortedActions.onLoad).toBeUndefined();
            expect(!!abortedActions.onLoadAbortable).toBeTruthy();
            expect(abortedActions.onLoadAbortable).toHaveLength(1);
            expect(abortedActions.onLoadAbortableParallel).toEqual(['id1', 'id2']);
            done();
          } catch (e) {
            done.fail(e);
          }
        },
      };

      const store = createStore(getInitialState, storeActions, storeOptions);

      store.init({});

      store.actions.onLoadAbortable();
      store.actions.onLoadAbortableParallel('id1');
      store.actions.onLoadAbortableParallel('id2');

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
        setProp: ({ args: [p] }) => ({ prop: p }),
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
        setProp: ({ args: [p] }) => ({ prop: p }),
      });

      const callback = jest.fn(() => {});

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
          setProp: ({ args: [p] }) => ({ prop: p }),
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

  describe('onPropsChanges called on mount', () => {
    type State = {
      prop1: string;
      prop2: string;
    };

    type Actions = {
      setProp1: (v: string) => void;
      setProp2: (v: string) => void;
    };

    type Props = {
      propIn: string;
    };

    it('simple effect', () => {
      const store = createStore<State, Actions, Props>(
        () => ({ prop1: '', prop2: '' }),
        {
          setProp1: ({ args: [p] }) => ({ prop1: p }),
          setProp2: ({ args: [p] }) => ({ prop2: p }),
        },
        {
          onPropsChange: [
            {
              getDeps: (p) => [p.propIn],
              effects: ({ p, isInit }) => {
                expect(isInit).toBeTruthy();
                return { prop1: p.propIn };
              },
              onMount: true,
            },
            {
              getDeps: (p) => [p.propIn],
              effects: ({ p, isInit }) => {
                expect(isInit).toBeTruthy();
                return { prop2: p.propIn };
              },
            },
          ],
        }
      );

      const callback = jest.fn(() => {});

      store.addStateListener(() => {
        callback();
      });

      store.init({
        propIn: 'init',
      });

      // side effect + onMount
      expect(callback).toHaveBeenCalledTimes(1);

      expect(store.state).toEqual({
        prop1: 'init',
        prop2: '',
      });
    });

    it('simple side effect', () => {
      const store = createStore<State, Actions, Props>(
        () => ({ prop1: '', prop2: '' }),
        {
          setProp1: ({ args: [p] }) => ({ prop1: p }),
          setProp2: ({ args: [p] }) => ({ prop2: p }),
        },
        {
          onPropsChange: [
            {
              getDeps: (p) => [p.propIn],
              sideEffects: ({ a, isInit }) => {
                expect(isInit).toBeTruthy();
                a.setProp1('effect');
              },
              onMount: true,
            },
            {
              getDeps: (p) => [p.propIn],
              sideEffects: ({ a, isInit }) => {
                a.setProp1('effect');
              },
            },
          ],
        }
      );

      const callback = jest.fn(() => {});

      store.addStateListener(() => {
        callback();
      });

      store.init({
        propIn: 'init',
      });

      // side effect + onMount
      expect(callback).toHaveBeenCalledTimes(2);

      expect(store.state).toEqual({
        prop1: 'effect',
        prop2: '',
      });
    });

    it('effect + side effect', () => {
      type State = {
        prop1: string;
        prop2: string;
        prop3: string;
        prop4: string;
      };

      type Actions = {
        setProp1: (v: string) => void;
        setProp2: (v: string) => void;
        setProp3: (v: string) => void;
        setProp4: (v: string) => void;
      };

      const store = createStore<State, Actions, Props>(
        () => ({
          prop1: '',
          prop2: '',
          prop3: '',
          prop4: '',
        }),
        {
          setProp1: ({ args: [p] }) => ({ prop1: p }),
          setProp2: ({ args: [p] }) => ({ prop2: p }),
          setProp3: ({ args: [p] }) => ({ prop3: p }),
          setProp4: ({ args: [p] }) => ({ prop4: p }),
        },
        {
          onPropsChange: [
            {
              getDeps: (p) => [p.propIn],
              effects: ({ p }) => ({ prop1: p.propIn }),
              sideEffects: ({ a }) => {
                a.setProp2('effect');
              },
              onMount: true,
            },
            {
              getDeps: (p) => [p.propIn],
              effects: ({ p }) => ({ prop3: p.propIn }),
              sideEffects: ({ a }) => {
                a.setProp4('effect2');
              },
            },
          ],
        }
      );

      const callback = jest.fn(() => {});

      store.addStateListener(() => {
        callback();
      });

      store.init({
        propIn: 'init',
      });

      // side effect + onMount
      expect(callback).toHaveBeenCalledTimes(2);

      expect(store.state).toEqual({
        prop1: 'init',
        prop2: 'effect',
        prop3: '',
        prop4: '',
      });
    });
  });
});
