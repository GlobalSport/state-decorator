import React from 'react';
import { shallow } from 'enzyme';
import StateDecorator, {
  isAsyncAction,
  isSyncAction,
  StateDecoratorActions,
  ConflictPolicy,
  retryDecorator,
  StateDecoratorProps,
  PromiseProvider,
  testSyncAction,
  testAsyncAction,
  computeAsyncActionInput,
  LoadingMap,
  LoadingMapParallelActions,
} from '../src/StateDecorator';

// Jest is not handling properly the failure in asynchronous functions
// (excepted the if the test returns a reject promise).
// Decorate you function with this to manage asynchronous functions.
function jestFail<S, A, P>(
  done: any,
  func: (
    s: S,
    a: A,
    loading?: boolean,
    loadingMap?: LoadingMap<A>,
    loadingParallelMap?: LoadingMapParallelActions<A>
  ) => any
) {
  return (
    s: S,
    a: A,
    loading?: boolean,
    loadingMap?: LoadingMap<A>,
    loadingParallelMap?: LoadingMapParallelActions<A>
  ) => {
    try {
      return func(s, a, loading, loadingMap, loadingParallelMap);
    } catch (e) {
      done.fail(e);
    }
  };
}

describe('Synchronous simple action', () => {
  it('handles calling an action', (done) => {
    type S = {
      value: string;
    };
    type A = {
      update: (value: string) => void;
    };
    type P = {
      prop: number;
    };

    const actions: StateDecoratorActions<S, A, P> = {
      update: {
        action: (s, args, p) => {
          expect(p.prop).toEqual(10);
          expect(args).toEqual(['updated']);
          return { ...s, value: args[0] };
        },
      },
    };

    const initialState = {
      value: 'initial',
    };

    const render = jestFail<S, A, P>(done, ({ value }, actions) => {
      expect(value).toBeDefined();
      expect(actions.update).toBeDefined();

      if (value === 'updated') {
        done();
      }
      return <div />;
    });

    const sdProps: StateDecoratorProps<S, A, P> = {
      actions,
      initialState: {
        value: 'initial',
      },
      props: {
        prop: 10,
      },
      onMount: (actions) => {
        actions.update('updated');
      },
    };

    const wrapper = shallow(<StateDecorator {...sdProps}>{render}</StateDecorator>);
  });

  it('handles onDone', (done) => {
    type S = {
      value: string;
    };
    type A = {
      update: (value: string) => void;
      update2: (value: string) => void;
    };
    type P = {
      prop: number;
    };

    const actions: StateDecoratorActions<S, A, P> = {
      update: {
        action: (s, [value], p) => ({ ...s, value }),
        onActionDone: (s, args, p, actions) => {
          expect(p.prop).toEqual(10);
          expect(args).toEqual(['updated']);
          expect(s.value).toEqual('updated');
          actions.update2('updated2');
        },
      },
      update2: (s, [value], p) => ({ ...s, value }),
    };

    const render = jestFail<S, A, P>(done, ({ value }, actions) => {
      expect(value).toBeDefined();
      expect(actions.update).toBeDefined();

      if (value === 'updated2') {
        done();
      }
      return <div />;
    });

    const sdProps: StateDecoratorProps<S, A, P> = {
      actions,
      initialState: {
        value: 'initial',
      },
      props: {
        prop: 10,
      },
      onMount: (actions) => {
        actions.update('updated');
      },
    };

    const wrapper = shallow(<StateDecorator {...sdProps}>{render}</StateDecorator>);
  });

  it('debounce is working correctly', (done) => {
    type S = {
      count: number;
      value: string;
    };
    type A = {
      update: (value: string) => void;
    };
    type P = {
      prop: number;
    };

    const actions: StateDecoratorActions<S, A, P> = {
      update: {
        action: (s, [value], p) => ({ ...s, value, count: s.count + 1 }),
        debounceTimeout: 200,
        onActionDone: (s, args, p, actions) => {
          expect(s.value).toEqual('updated');
          expect(s.count).toBe(1);
          done();
        },
      },
    };

    const render = jestFail<S, A, P>(done, ({ value }, actions) => {
      return <div />;
    });

    const sdProps: StateDecoratorProps<S, A, P> = {
      actions,
      initialState: {
        value: 'initial',
        count: 0,
      },
      props: {
        prop: 10,
      },
      onMount: (actions) => {
        actions.update('up');
        actions.update('upda');
        actions.update('updated');
      },
    };

    const wrapper = shallow(<StateDecorator {...sdProps}>{render}</StateDecorator>);
  });
});
