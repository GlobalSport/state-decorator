import React from 'react';
import { shallow } from 'enzyme';
import StateDecorator, { StateDecoratorActions, StateDecoratorProps } from '../src/StateDecorator';

type ItemMap = { [k: string]: { id: string; value: string } };

// Jest is not handling properly the failure in asynchronous functions
// (excepted the if the test returns a reject promise).
// Decorate you function with this to manage asynchronous functions.
const jestFail = (done, func) => (...args) => {
  try {
    return func(...args);
  } catch (e) {
    done.fail(e);
  }
};

describe('On props change', () => {
  it('when no props of interest change, callbacks are not called 1', () => {
    type Item = {
      id: string;
      value: string;
    };

    type State = {
      item: Item;
    };

    const initialState: State = {
      item: {
        id: 'id1',
        value: 'value1',
      },
    };

    type Actions = {
      get: () => any;
    };

    const actions: StateDecoratorActions<State, Actions, any> = {
      get: (s) => s,
    };

    const props: StateDecoratorProps<State, Actions, ItemMap> = {
      actions,
      initialState,
      getPropsRefValues: (p) => [],
      onPropsChange: jest.fn(),
      onPropsChangeReducer: jest.fn(),
      props: {
        item: {
          id: 'id1',
          value: 'value1',
        },
      },
    };

    const wrapper = shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);

    wrapper.setProps({
      item: {
        id: 'id2',
        value: 'value2',
      },
    });

    expect(props.onPropsChange).not.toHaveBeenCalled();
    expect(props.onPropsChangeReducer).not.toHaveBeenCalled();
  });

  it('when no props of interest change, callbacks are not called 2', () => {
    type Item = {
      id: string;
      value: string;
    };

    type State = {
      item: Item;
      item2: Item;
    };

    const initialState: State = {
      item: {
        id: 'id1',
        value: 'value1',
      },
      item2: {
        id: 'id1',
        value: 'value1',
      },
    };

    type Actions = {
      get: () => any;
    };

    const actions: StateDecoratorActions<State, Actions, any> = {
      get: (s) => s,
    };

    const props: StateDecoratorProps<State, Actions, ItemMap> = {
      actions,
      initialState,
      getPropsRefValues: (p) => [p.item.id],
      onPropsChange: jest.fn(),
      onPropsChangeReducer: jest.fn(),
      props: {
        item: {
          id: 'id1',
          value: 'value1',
        },
      },
    };

    const wrapper = shallow(<StateDecorator {...props}>{() => <div />}</StateDecorator>);

    wrapper.setProps({
      item2: {
        id: 'id2',
        value: 'value2',
      },
    });

    expect(props.onPropsChange).not.toHaveBeenCalled();
    expect(props.onPropsChangeReducer).not.toHaveBeenCalled();
  });

  it('when one prop of interest change, callbacks are called', (done) => {
    type Item = {
      id: string;
      value: string;
    };

    type State = {
      item: Item;
      item2: Item;
    };

    const initialState: State = {
      item: {
        id: 'id1',
        value: 'value1',
      },
      item2: {
        id: 'id1',
        value: 'value1',
      },
    };

    type Actions = {
      get: () => any;
      action2: () => any;
    };

    const action2Mock = jest.fn();

    const actions: StateDecoratorActions<State, Actions, any> = {
      get: (s) => s,
      action2: (s) => {
        action2Mock();
        return s;
      },
    };

    const props: StateDecoratorProps<State, Actions, ItemMap> = {
      actions,
      initialState,
      getPropsRefValues: (p) => [p && p.item.id, p && p.item2.id],
      onPropsChange: jest.fn((s, p, a, indices) => {
        expect(s.item.id).toEqual('id2');
        expect(p.item.id).toEqual('id2');
        expect(a.get).toBeInstanceOf(Function);
        expect(indices).toEqual([0]);
        a.action2();
        done();
      }),
      onPropsChangeReducer: jest.fn((s, p) => ({ ...s, item: p.item })),
      props: {
        item: {
          id: 'id1',
          value: 'value1',
        },
        item2: {
          id: 'id1',
          value: 'value1',
        },
      },
    };

    let stateHasChanged = false;

    const renderFunction = jestFail(done, (state: State, actions, loading, loadingMap, loadingParallelMap) => {
      if (state.item.id === 'id2') {
        stateHasChanged = true;
      }

      return <div />;
    });

    const wrapper = shallow(<StateDecorator {...props}>{renderFunction}</StateDecorator>);

    wrapper.setProps({
      props: {
        ...props.props,
        item: {
          id: 'id2',
          value: 'value2',
        },
      },
    });

    expect(props.onPropsChangeReducer).toHaveBeenCalled();
    expect(stateHasChanged).toBeTruthy();
  });
});
