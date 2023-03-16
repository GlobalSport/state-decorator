import {
  setArgIn,
  setArgsInArray,
  setFalseIn,
  setArgsInMap,
  setResIn,
  setTrueIn,
  toggleProp,
  setResInArray,
  setResInMap,
} from '../src/helpers';

type State = {
  myProp: string;
  myBool: boolean;
  myMap: Record<string, string>;
  myArr: string[];
  isDirty: boolean;
};

const defaultState: State = {
  myProp: 'init',
  myBool: false,
  myMap: {},
  myArr: [],
  isDirty: false,
};

function invoke(f: Function, state: State, args: any[] = [], res: any = undefined): State {
  return { ...state, ...f({ s: state, args, res }) };
}

describe('Helper effect functions', () => {
  it('setArgIn', () => {
    const f = setArgIn<State, 'myProp', 'isDirty'>('myProp');
    const state: State = {
      ...defaultState,
    };

    const newState = invoke(f, state, ['newValue']);
    expect(newState.myProp).toEqual('newValue');
    expect(newState.isDirty).toBeFalsy();
  });

  it('setArgIn (isDrity)', () => {
    const f = setArgIn<State, 'myProp', 'isDirty'>('myProp', 'isDirty');
    const state: State = {
      ...defaultState,
    };

    const newState = invoke(f, state, ['newValue']);
    expect(newState.myProp).toEqual('newValue');
    expect(newState.isDirty).toBeTruthy();
  });

  it('setTrueIn', () => {
    const f = setTrueIn<State, 'myBool', 'isDirty'>('myBool');
    const state: State = {
      ...defaultState,
      myBool: false,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeTruthy();
    expect(newState.isDirty).toBeFalsy();
  });

  it('setTrueIn (isDirty)', () => {
    const f = setTrueIn<State, 'myBool', 'isDirty'>('myBool', 'isDirty');
    const state: State = {
      ...defaultState,
      myBool: false,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeTruthy();
    expect(newState.isDirty).toBeTruthy();
  });

  it('setFalseIn', () => {
    const f = setFalseIn<State, 'myBool', 'isDirty'>('myBool');
    const state: State = {
      ...defaultState,

      myBool: true,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeFalsy();
    expect(newState.isDirty).toBeFalsy();
  });

  it('setFalseIn (isDirty)', () => {
    const f = setFalseIn<State, 'myBool', 'isDirty'>('myBool', 'isDirty');
    const state: State = {
      ...defaultState,

      myBool: true,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeFalsy();
    expect(newState.isDirty).toBeTruthy();
  });

  it('toggleProp (true)', () => {
    const f = toggleProp<State, 'myBool', 'isDirty'>('myBool');
    const state: State = {
      ...defaultState,

      myBool: true,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeFalsy();
    expect(newState.isDirty).toBeFalsy();
  });

  it('toggleProp (true, isDirty)', () => {
    const f = toggleProp<State, 'myBool', 'isDirty'>('myBool', 'isDirty');
    const state: State = {
      ...defaultState,

      myBool: true,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeFalsy();
    expect(newState.isDirty).toBeTruthy();
  });

  it('toggleProp (false)', () => {
    const f = toggleProp<State, 'myBool', 'isDirty'>('myBool');
    const state: State = {
      ...defaultState,

      myBool: false,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeTruthy();
    expect(newState.isDirty).toBeFalsy();
  });

  it('toggleProp (false, isDirty)', () => {
    const f = toggleProp<State, 'myBool', 'isDirty'>('myBool', 'isDirty');
    const state: State = {
      ...defaultState,

      myBool: false,
    };

    const newState = invoke(f, state);

    expect(newState.myBool).toBeTruthy();
    expect(newState.isDirty).toBeTruthy();
  });

  it('setArgsInMap', () => {
    const f = setArgsInMap<State, 'myMap', 'isDirty', string>('myMap');
    const state: State = {
      ...defaultState,
    };

    const newState = invoke(f, state, ['id', 'value']);

    expect(newState.myMap).toEqual({
      id: 'value',
    });
    expect(newState.isDirty).toBeFalsy();
  });

  it('setArgsInMap (isDirty)', () => {
    const f = setArgsInMap<State, 'myMap', 'isDirty', string>('myMap', 'isDirty');
    const state: State = {
      ...defaultState,
    };

    const newState = invoke(f, state, ['id', 'value']);

    expect(newState.myMap).toEqual({
      id: 'value',
    });
    expect(newState.isDirty).toBeTruthy();
  });

  it('setArgsInArray', () => {
    const f = setArgsInArray<State, 'myArr', 'isDirty', string>('myArr');
    const state: State = {
      ...defaultState,
    };
    const newState = invoke(f, state, [0, 'value']);

    expect(newState.myArr).toEqual(['value']);
    expect(newState.isDirty).toBeFalsy();
  });

  it('setArgsInArray (isDrity)', () => {
    const f = setArgsInArray<State, 'myArr', 'isDirty', string>('myArr', 'isDirty');
    const state: State = {
      ...defaultState,
    };
    const newState = invoke(f, state, [0, 'value']);

    expect(newState.myArr).toEqual(['value']);
    expect(newState.isDirty).toBeTruthy();
  });

  it('setResIn', () => {
    const f = setResIn<State, 'myProp', 'isDirty'>('myProp');
    const state: State = {
      ...defaultState,
    };

    const newState = invoke(f, state, [], 'newValue');
    expect(newState.myProp).toEqual('newValue');
    expect(newState.isDirty).toBeFalsy();
  });

  it('setResIn (isDirty)', () => {
    const f = setResIn<State, 'myProp', 'isDirty'>('myProp', 'isDirty');
    const state: State = {
      ...defaultState,
    };

    const newState = invoke(f, state, [], 'newValue');
    expect(newState.myProp).toEqual('newValue');
    expect(newState.isDirty).toBeTruthy();
  });

  it('setResInArray', () => {
    const f = setResInArray<State, 'myArr', 'isDirty', string>('myArr');
    const state: State = {
      ...defaultState,
    };
    const newState = invoke(f, state, [0], 'value');

    expect(newState.myArr).toEqual(['value']);
    expect(newState.isDirty).toBeFalsy();
  });

  it('setResInArray (isDirty)', () => {
    const f = setResInArray<State, 'myArr', 'isDirty', string>('myArr', 'isDirty');
    const state: State = {
      ...defaultState,
    };
    const newState = invoke(f, state, [0], 'value');

    expect(newState.myArr).toEqual(['value']);
    expect(newState.isDirty).toBeTruthy();
  });

  it('setResInMap', () => {
    const f = setResInMap<State, 'myMap', 'isDirty', string>('myMap');
    const state: State = {
      ...defaultState,
    };

    const newState = invoke(f, state, ['id'], 'value');

    expect(newState.myMap).toEqual({
      id: 'value',
    });
    expect(newState.isDirty).toBeFalsy();
  });
});
