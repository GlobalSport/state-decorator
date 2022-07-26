import { setArgIn, setArrayItem, setFalseIn, setMapItem, setTrueIn, toggleProp } from '../src/helpers';

type State = {
  myProp: string;
  myBool: boolean;
  myMap: Record<string, string>;
  myArr: string[];
};

const defaultState: State = {
  myProp: 'init',
  myBool: false,
  myMap: {},
  myArr: [],
};

describe('Helper effect functions', () => {
  it('setArgIn', () => {
    const f = setArgIn<State, 'myProp'>('myProp');
    const state: State = {
      ...defaultState,
    };

    const newState = f({ s: state, args: ['newValue'] });
    expect(newState.myProp).toEqual('newValue');
  });

  it('setTrueIn', () => {
    const f = setTrueIn<State, 'myBool'>('myBool');
    const state: State = {
      ...defaultState,
      myBool: false,
    };

    const newState = f({ s: state });
    expect(newState.myBool).toBeTruthy();
  });

  it('setFalseIn', () => {
    const f = setFalseIn<State, 'myBool'>('myBool');
    const state: State = {
      ...defaultState,

      myBool: true,
    };

    const newState = f({ s: state });
    expect(newState.myBool).toBeFalsy();
  });

  it('toggleProp (true)', () => {
    const f = toggleProp<State, 'myBool'>('myBool');
    const state: State = {
      ...defaultState,

      myBool: true,
    };

    const newState = f({ s: state });
    expect(newState.myBool).toBeFalsy();
  });

  it('toggleProp (false)', () => {
    const f = toggleProp<State, 'myBool'>('myBool');
    const state: State = {
      ...defaultState,

      myBool: false,
    };

    const newState = f({ s: state });
    expect(newState.myBool).toBeTruthy();
  });

  it('setMapItem', () => {
    const f = setMapItem<State, 'myMap', string>('myMap');
    const state: State = {
      ...defaultState,
    };

    const newState = f({ s: state, args: ['id', 'value'] });
    expect(newState.myMap).toEqual({
      id: 'value',
    });
  });

  it('setArrayItem', () => {
    const f = setArrayItem<State, 'myArr', string>('myArr');
    const state: State = {
      ...defaultState,
    };

    const newState = f({ s: state, args: [0, 'value'] });
    expect(newState.myArr).toEqual(['value']);
  });
});
