import { StateDecoratorActions } from '../../src/types';
import {
  getUseReducer,
  getInitialHookState,
  ReducerActionType,
  ReducerActionSubType,
  ReducerAction,
  decorateSyncAction,
} from '../../src/useStateDecorator';
import { getTimeoutPromise } from './testUtils';

describe('optimistic actions', () => {
  type S = {
    value: string;
  };
  type A = {
    setValue: (v: string) => void;
  };
  type P = {};

  const actions: StateDecoratorActions<S, A> = {
    setValue: (s, [value]) => ({ ...s, value }),
  };

  const getInitialState = (): S => ({
    value: null,
  });

  describe('getUseReducer', () => {
    it('handles action with preReducer and optimisticReducer correctly', () => {
      const preReducer = jest.fn((s, [value]) => {
        return { ...s, value: 'pre' };
      });

      const optimisticReducer = jest.fn((s, [value]) => {
        return { ...s, value: `${s.value}_optimistic` };
      });

      const actions: StateDecoratorActions<S, A, P> = {
        setValue: {
          preReducer,
          optimisticReducer,
          promise: () => getTimeoutPromise(0, 'result'),
        },
      };

      const hookState = getInitialHookState((p: P) => ({ value: 'initial' }), actions, { prop: '' });

      const reducerFunc = getUseReducer(actions, {});

      const reducerAction: ReducerAction<S, any, A, P> = {
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.BEFORE_PROMISE,
        actionName: 'setValue',
        args: ['value'],
        props: { prop: 'prop' },
      };

      const newHookState = reducerFunc(hookState, reducerAction);

      expect(newHookState.state).toEqual({ value: 'pre_optimistic' });
      expect(newHookState.loadingMap.setValue).toBeFalsy();

      const optData = newHookState.optimisticData;
      expect(optData.optimisticActions.setValue).toBeTruthy();
      expect(optData.history[0].actionName).toEqual('setValue');
      expect(optData.history[0].reducer).toEqual('optimisticReducer');
      expect(optData.history[0].beforeState).toBeDefined();
      expect(optData.shouldRecordHistory).toBeTruthy();
    });

    it('handles action with optimisticReducer correctly', () => {
      const preReducer = jest.fn((s, [value]) => {
        return { ...s, value: 'pre' };
      });

      const optimisticReducer = jest.fn((s, [value]) => {
        return { ...s, value: `${s.value}_optimistic` };
      });

      const actions: StateDecoratorActions<S, A, P> = {
        setValue: {
          optimisticReducer,
          promise: () => getTimeoutPromise(0, 'result'),
        },
      };

      const hookState = getInitialHookState((p: P) => ({ value: 'initial' }), actions, { prop: '' });

      const reducerFunc = getUseReducer(actions, {});

      const reducerAction: ReducerAction<S, any, A, P> = {
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.BEFORE_PROMISE,
        actionName: 'setValue',
        args: ['value'],
        props: { prop: 'prop' },
      };

      const newHookState = reducerFunc(hookState, reducerAction);

      expect(newHookState.state).toEqual({ value: 'initial_optimistic' });
      expect(newHookState.loadingMap.setValue).toBeFalsy();

      const optData = newHookState.optimisticData;
      expect(optData.optimisticActions.setValue).toBeTruthy();
      expect(optData.history[0].actionName).toEqual('setValue');
      expect(optData.history[0].reducer).toEqual('optimisticReducer');
      expect(optData.history[0].beforeState).toBeDefined();
      expect(optData.shouldRecordHistory).toBeTruthy();
    });

    it('handles sync action correctly', () => {
      type S = { value: string };
      type A = {
        setValue: (v: string) => void;
      };
      type P = { prop: string };

      const actions: StateDecoratorActions<S, A, P> = {
        setValue: (s, [value], p) => ({ ...s, value: `${value}_${p.prop}` }),
      };

      const hookState = getInitialHookState((p: P) => ({ value: 'initial' }), actions, { prop: '' });
      hookState.optimisticData.shouldRecordHistory = true;

      const reducer = getUseReducer(actions, {});
      const reducerAction: ReducerAction<S, any, A, P> = {
        type: ReducerActionType.ACTION,
        actionName: 'setValue',
        args: ['value'],
        props: { prop: 'prop' },
      };

      const newHookState = reducer(hookState, reducerAction);

      expect(newHookState.state).toEqual({ value: 'value_prop' });

      const optData = newHookState.optimisticData;
      expect(optData.history[0].actionName).toBe('setValue');
      expect(optData.history[0].reducer).toBeNull();
      expect(optData.history[0].beforeState).toBeNull();
      expect(optData.history[0].args).toEqual([['value'], { prop: 'prop' }]);
    });

    it('handles advanced sync action correctly', () => {
      type S = { value: string };
      type A = {
        setValue: (v: string) => void;
      };
      type P = { prop: string };

      const actions: StateDecoratorActions<S, A, P> = {
        setValue: {
          action: (s, [value], p) => ({ ...s, value: `${value}_${p.prop}` }),
        },
      };

      const hookState = getInitialHookState((p: P) => ({ value: 'initial' }), actions, { prop: '' });
      hookState.optimisticData.shouldRecordHistory = true;

      const reducer = getUseReducer(actions, {});
      const reducerAction: ReducerAction<S, any, A, P> = {
        type: ReducerActionType.ACTION,
        actionName: 'setValue',
        args: ['value'],
        props: { prop: 'prop' },
      };

      const newHookState = reducer(hookState, reducerAction);

      expect(newHookState.state).toEqual({ value: 'value_prop' });

      const optData = newHookState.optimisticData;
      expect(optData.history[0].actionName).toBe('setValue');
      expect(optData.history[0].reducer).toBeNull();
      expect(optData.history[0].beforeState).toBeNull();
      expect(optData.history[0].args).toEqual([['value'], { prop: 'prop' }]);
    });

    it('handles action success while other optimistic action ongoing correctly', () => {
      const actions: StateDecoratorActions<S, A, P> = {
        setValue: {
          reducer: (s, value) => ({
            ...s,
            value,
          }),
          promise: () => getTimeoutPromise(0, 'result'),
        },
      };

      const hookState = getInitialHookState((p: P) => ({ value: 'initial' }), actions, { prop: '' });
      hookState.optimisticData.shouldRecordHistory = true;

      const reducerFunc = getUseReducer(actions, {});

      const reducerAction: ReducerAction<S, any, A, P> = {
        type: ReducerActionType.ACTION,
        subType: ReducerActionSubType.SUCCESS,
        actionName: 'setValue',
        args: ['value'],
        result: 'value',
        props: { prop: 'prop' },
      };

      const newHookState = reducerFunc(hookState, reducerAction);

      expect(newHookState.state).toEqual({ value: 'value' });
      expect(newHookState.loadingMap.setValue).toBeFalsy();

      const optData = newHookState.optimisticData;
      expect(optData.history[0].actionName).toEqual('setValue');
      expect(optData.history[0].reducer).toEqual('reducer');
      expect(optData.history[0].beforeState).toBeNull();
      expect(optData.shouldRecordHistory).toBeTruthy();
    });

    describe('Optimistic action ends', () => {
      type S = {
        value: string;
        value2: string;
      };
      type A = {
        setValue: (value: string) => Promise<string>;
        setValue2: (value: string) => void;
        setValue2Adv: (value: string) => void;
        setValue2Async: (value: string) => void;
      };
      const actions: StateDecoratorActions<S, A, P> = {
        setValue: {
          reducer: (s, value) => ({
            ...s,
            value,
          }),
          promise: () => getTimeoutPromise(0, 'result'),
        },
        setValue2: (s, [value2]) => ({ ...s, value2: `${s.value2} ${value2}` }),
        setValue2Adv: {
          action: (s, [value2]) => ({ ...s, value2: `${s.value2} ${value2}` }),
        },
        setValue2Async: {
          preReducer: (s, [value2]) => ({ ...s, value2: `${s.value2} pre-${value2}` }),
          promise: ([value]) => getTimeoutPromise(0, value),
          reducer: (s, value2) => ({ ...s, value2: `${s.value2} reducer-${value2}` }),
          errorReducer: (s, err, [value2]) => ({ ...s, value2: `${s.value2} error-${value2}` }),
        },
      };

      function populateHistory(oldOptData) {
        oldOptData.shouldRecordHistory = true;
        oldOptData.optimisticActions.setValue = true;
        oldOptData.history.push(
          {
            actionName: 'setValue',
            reducer: 'optimisticReducer',
            args: [['value'], {}],
            beforeState: {
              value: 'before',
              value2: 'before',
            },
          },
          {
            actionName: 'setValue2',
            reducer: null,
            args: [['sync'], {}],
            beforeState: null,
          },
          {
            actionName: 'setValue2Adv',
            reducer: null,
            args: [['advanced'], {}],
            beforeState: null,
          },
          {
            actionName: null,
            reducer: 'onPropChangeReducer',
            args: [{ prop: 'props_updated' }],
            beforeState: null,
          },
          {
            actionName: 'setValue2Async',
            reducer: 'preReducer',
            args: [['async'], {}],
            beforeState: null,
          },
          {
            actionName: 'setValue2Async',
            reducer: 'reducer',
            args: [['async'], {}],
            beforeState: null,
          },
          {
            actionName: 'setValue2Async',
            reducer: 'errorReducer',
            args: ['err', ['error']],
            beforeState: null,
          }
        );
      }

      it('with success', () => {
        const hookState = getInitialHookState((p: P) => ({ value: 'initial', value2: 'initial' }), actions, {
          prop: '',
        });
        populateHistory(hookState.optimisticData);

        const reducerFunc = getUseReducer(actions, {});

        const reducerAction: ReducerAction<S, any, A, P> = {
          type: ReducerActionType.ACTION,
          subType: ReducerActionSubType.SUCCESS,
          actionName: 'setValue',
          args: ['value'],
          result: 'value',
          props: { prop: 'prop' },
        };

        const newHookState = reducerFunc(hookState, reducerAction);

        const optData = newHookState.optimisticData;
        // clean
        expect(optData.history).toHaveLength(0);
        // action is marked as not ongoing
        expect(optData.optimisticActions.setValue).toBeFalsy();
        // no need to record history anymore
        expect(optData.shouldRecordHistory).toBeFalsy();
        // reducer was applied
        expect(newHookState.state).toEqual({ value: 'value', value2: 'initial' });
      });

      it('with success (while other optimistic ongoing)', () => {
        const hookState = getInitialHookState((p: P) => ({ value: 'initial', value2: 'initial' }), actions, {
          prop: '',
        });

        const oldOptData = hookState.optimisticData;

        oldOptData.shouldRecordHistory = true;
        oldOptData.optimisticActions.setValue = true;
        oldOptData.optimisticActions.setValue2 = true;

        oldOptData.history.push(
          {
            actionName: 'setValue',
            reducer: 'optimisticReducer',
            args: [['value'], {}],
            beforeState: {
              value: 'before',
              value2: 'before',
            },
          },
          {
            actionName: 'setValue2',
            reducer: null,
            args: [['sync'], {}],
            beforeState: null,
          },
          {
            actionName: 'setValue2',
            reducer: 'optimisticReducer',
            args: [['value'], {}],
            beforeState: {
              value: 'before',
              value2: 'sync',
            },
          },
          {
            actionName: 'setValue2',
            reducer: null,
            args: [['advanced'], {}],
            beforeState: null,
          }
        );

        const reducerFunc = getUseReducer(actions, {});

        const reducerAction: ReducerAction<S, any, A, P> = {
          type: ReducerActionType.ACTION,
          subType: ReducerActionSubType.SUCCESS,
          actionName: 'setValue',
          args: ['value'],
          result: 'value',
          props: { prop: 'prop' },
        };

        const newHookState = reducerFunc(hookState, reducerAction);

        const optData = newHookState.optimisticData;
        // clean
        // 3 = reducer of action + 2 remaining actions
        expect(optData.history).toHaveLength(3);

        expect(optData.optimisticActions.setValue).toBeFalsy();
        expect(optData.optimisticActions.setValue2).toBeTruthy();

        // still need to record history
        expect(optData.shouldRecordHistory).toBeTruthy();

        // reducer was applied
        expect(newHookState.state).toEqual({ value: 'value', value2: 'initial' });
      });

      it('with error', () => {
        const hookState = getInitialHookState((p: P) => ({ value: 'initial', value2: 'initial' }), actions, {
          prop: '',
        });
        populateHistory(hookState.optimisticData);

        const reducerFunc = getUseReducer(actions, {
          onPropsChangeReducer: (s, p) => ({ ...s, value: `${s.value} ${p.prop}` }),
        });

        const reducerAction: ReducerAction<S, any, A, P> = {
          type: ReducerActionType.ACTION,
          subType: ReducerActionSubType.ERROR,
          error: 'Boom',
          actionName: 'setValue',
          args: ['value'],
          props: { prop: 'prop' },
          rawActionsRef: { current: actions },
        };

        const newHookState = reducerFunc(hookState, reducerAction);

        const optData = newHookState.optimisticData;
        // clean
        expect(optData.history).toHaveLength(0);
        // action is marked as not ongoing
        expect(optData.optimisticActions.setValue).toBeFalsy();
        // no need to record history anymore
        expect(optData.shouldRecordHistory).toBeFalsy();
        // action was restored
        expect(newHookState.state).toEqual({
          value: 'before props_updated',
          value2: 'before sync advanced pre-async reducer-async error-error',
        });
      });

      it('with error (while other optimistic ongoing)', () => {
        const hookState = getInitialHookState((p: P) => ({ value: 'initial', value2: 'initial' }), actions, {
          prop: '',
        });

        const oldOptData = hookState.optimisticData;

        oldOptData.shouldRecordHistory = true;
        oldOptData.optimisticActions.setValue = true;
        oldOptData.optimisticActions.setValue2 = true;

        oldOptData.history.push(
          {
            actionName: 'setValue',
            reducer: 'optimisticReducer',
            args: [['value'], {}],
            beforeState: {
              value: 'before',
              value2: 'before',
            },
          },
          {
            actionName: 'setValue2',
            reducer: null,
            args: [['sync'], {}],
            beforeState: null,
          },
          {
            actionName: 'setValue2',
            reducer: 'optimisticReducer',
            args: [['opti'], {}],
            beforeState: {
              value: 'before',
              value2: 'sync',
            },
          },
          {
            actionName: 'setValue2',
            reducer: null,
            args: [['advanced'], {}],
            beforeState: null,
          }
        );

        const reducerFunc = getUseReducer(actions, {});

        const reducerAction: ReducerAction<S, any, A, P> = {
          type: ReducerActionType.ACTION,
          subType: ReducerActionSubType.ERROR,
          actionName: 'setValue',
          args: ['value'],
          error: 'error',
          props: { prop: 'prop' },
          rawActionsRef: { current: actions },
        };

        const newHookState = reducerFunc(hookState, reducerAction);

        const optData = newHookState.optimisticData;
        // clean
        // 3 = reducer of action + 2 remaining actions
        expect(optData.history).toHaveLength(2);

        expect(optData.optimisticActions.setValue).toBeFalsy();
        expect(optData.optimisticActions.setValue2).toBeTruthy();

        // still need to record history
        expect(optData.shouldRecordHistory).toBeTruthy();

        // reducer was applied
        expect(newHookState.state).toEqual({ value: 'before', value2: 'before sync opti advanced' });
      });
    });
  });
});
