import { setArgIn, setArrayItem, setFalseIn, setMapItem, setResIn, setTrueIn, toggleProp } from '../src/helpers';

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

function invoke(f: Function, state: State, args: any[] = [], res: any = undefined): State {
  return { ...state, ...f({ s: state, args, res }) };
}

describe('Helper effect functions', () => {
  it('setArgIn', () => {
    const f = setArgIn<State, 'myProp'>('myProp');
    const state: State = {
      ...defaultState,
    };

    const newState = invoke(f, state, ['newValue']);
    expect(newState.myProp).toEqual('newValue');
  });

  it('setTrueIn', () => {
    const f = setTrueIn<State, 'myBool'>('myBool');
    const state: State = {
      ...defaultState,
      myBool: false,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeTruthy();
  });

  it('setFalseIn', () => {
    const f = setFalseIn<State, 'myBool'>('myBool');
    const state: State = {
      ...defaultState,

      myBool: true,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeFalsy();
  });

  it('toggleProp (true)', () => {
    const f = toggleProp<State, 'myBool'>('myBool');
    const state: State = {
      ...defaultState,

      myBool: true,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeFalsy();
  });

  it('toggleProp (false)', () => {
    const f = toggleProp<State, 'myBool'>('myBool');
    const state: State = {
      ...defaultState,

      myBool: false,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeTruthy();
  });

  it('setMapItem', () => {
    const f = setMapItem<State, 'myMap', string>('myMap');
    const state: State = {
      ...defaultState,
    };

    const newState = invoke(f, state, ['id', 'value']);

    expect(newState.myMap).toEqual({
      id: 'value',
    });
  });

  it('setArrayItem', () => {
    const f = setArrayItem<State, 'myArr', string>('myArr');
    const state: State = {
      ...defaultState,
    };
    const newState = invoke(f, state, [0, 'value']);

    expect(newState.myArr).toEqual(['value']);
  });

  it('setResIn', () => {
    const f = setResIn<State, 'myProp'>('myProp');
    const state: State = {
      ...defaultState,
    };

    const newState = invoke(f, state, [], 'newValue');
    expect(newState.myProp).toEqual('newValue');
  });
});
