/*
 * Copyright 2019 Globalsport SAS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { useState, createContext, memo } from 'react';
import { useStoreContextSlice, useLocalStore, StoreApi, StoreConfig } from './sd';
import { useRef } from 'react';
import FlashingBox from './FlashingBox';

import { Typography, Box } from '@mui/material';

type State = {
  list: string[];
  prop1: string;
  prop2: string;
  prop3: string;
};

type DerivedState = {
  listFiltered: string[];
};

type Actions = {
  addItem: (param: string) => void;
  setProp1: (item: string) => void;
  setProp2: (item: string) => void;
  setProp3: (item: string) => void;
  setProp3Debounced: (item: string) => void;
  resetProp3: () => void;
  loadList: () => Promise<string[]>;
  loadAndFail: (fail: boolean) => Promise<any>;
  loadCancel: () => Promise<any>;
};

type Props = {
  init: number;
};

const storeConfig: StoreConfig<State, Actions, Props, DerivedState> = {
  getInitialState: (p) => ({ list: [p.init.toString()], prop1: '', prop2: '', prop3: '' }),
  actions: {
    addItem: ({ s, args: [param] }) => ({
      list: [...s.list, param],
    }),
    setProp1: ({ args: [v] }) => ({
      prop1: v,
    }),
    setProp2: ({ args: [v] }) => ({
      prop2: v,
    }),
    resetProp3: () => ({
      prop3: '',
    }),
    setProp3: {
      effects: ({ args: [v] }) => ({
        prop3: v,
      }),
      sideEffects: ({ a }) => {
        a.loadList();
      },
      debounceSideEffectsTimeout: 1000,
    },
    setProp3Debounced: {
      effects: ({ s, args: [v] }) => ({
        prop3: v,
      }),
      sideEffects: ({ a }) => {
        a.loadList();
      },
      debounceTimeout: 500,
    },
    loadList: {
      getPromise: () => {
        const res = new Array(10).fill(null);
        res.forEach((_, index) => {
          res[index] = `${Math.floor(Math.random() * 100)}`;
        });

        return new Promise((resolve) => {
          setTimeout(resolve, 1000, res);
        });
      },
      effects: ({ res: list }) => ({ list }),
      sideEffects: ({ s, a }) => {
        a.setProp1(s.list[0]);
      },
    },
    loadAndFail: {
      getPromise: ({ args: [fail] }) =>
        new Promise((res, reject) => {
          fail ? setTimeout(reject, 1000, new Error('boom')) : setTimeout(res, 1000, {});
        }),
      sideEffects: ({ a }) => {
        a.setProp2('');
      },
      errorSideEffects: ({ a }) => {
        a.setProp2('Error');
      },
    },
    loadCancel: {
      getPromise: () => null,
      effects: () => ({ prop2: 'test' }),
    },
  },
  name: 'StateDecorator sample',
  onMount: ({ a }) => {
    a.loadList();
  },
  derivedState: {
    listFiltered: {
      getDeps: ({ s }) => [s.list],
      get: ({ s }) => (s.list == null ? [] : s.list.filter((i) => i.indexOf('1') !== -1)),
    },
  },
};

export const StoreContext = createContext<StoreApi<State, Actions, Props, DerivedState>>(null);

export function StoreContextProvider(p: Props & { children: any }) {
  const { children, ...props } = p;
  const store = useLocalStore(storeConfig, props, false);
  return <StoreContext.Provider value={store}>{p.children}</StoreContext.Provider>;
}

export default function MyContainer() {
  const [show, setShow] = useState(true);

  return (
    <Box>
      <Typography variant="h6">State sharing</Typography>
      <Typography variant="caption">
        The state is contained in the root and each sub component uses a s. Flashing means re-render.
        <br />
        Open devtools console and redux dev tools if installed to see state changes.
      </Typography>
      <FlashingBox>
        <Box mt={2}>
          <div>Root</div>
          <button onClick={(e) => setShow(!show)}>{show ? 'unmount ' : 'mount'}</button>
        </Box>
        {show && <StateContainer init={42} />}
      </FlashingBox>
    </Box>
  );
}

export function StateContainer(props: Props) {
  return (
    <StoreContextProvider {...props}>
      <StateView />
    </StoreContextProvider>
  );
}

export function StateView() {
  const logNodeRef = useRef<HTMLDivElement>();

  const state = useStoreContextSlice(StoreContext, (i) => i);

  return (
    <FlashingBox>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1 }}>
          <div>State container</div>
          <div>list: [{state.list.join(', ')}]</div>
          <div>prop1: {state.prop1}</div>
          <div>prop2: {state.prop2}</div>
          <div>listFiltered: {state.listFiltered.join(', ')}</div>
          <div>errorMap:</div>
          {((Object.keys(state.errorMap) as unknown) as (keyof Actions)[]).map((k) => (
            <div key={k}>{`${k} -> ${state.errorMap[k]?.toString()}`}</div>
          ))}
        </div>
        <div ref={logNodeRef} style={{ flex: 1 }}></div>
      </div>
      <Child2 />
    </FlashingBox>
  );
}

const Child2 = memo(function Child2() {
  return (
    <FlashingBox>
      <div>Memo Child (no props)</div>
      <List />
      <Prop1 />
      <Prop2 />
      <LoadList />
      <Prop3 />
      <Prop3Debounced />
      <LoadFail />
      <LoadCancel />
    </FlashingBox>
  );
});

function List() {
  const s = useStoreContextSlice(StoreContext, ['list', 'addItem']);

  return (
    <FlashingBox>
      <div>
        <div>list: [{s.list.join(', ')}]</div>
      </div>
      <div>
        <InputButton buttonLabel="Add to list" onAction={(item) => s.addItem(item)} />
      </div>
    </FlashingBox>
  );
}

function Prop1() {
  const s = useStoreContextSlice(StoreContext, ['prop1', 'setProp1']);

  return (
    <FlashingBox>
      <div>
        <div>prop1: {s.prop1}</div>
      </div>
      <div>
        <InputButton buttonLabel="Set Item" onAction={(item) => s.setProp1(item)} />
      </div>
    </FlashingBox>
  );
}

function LoadList() {
  const { loadList, loading } = useStoreContextSlice(StoreContext, (ctx) => ({
    loadList: ctx.loadList,
    loading: ctx.loadingMap.loadList,
  }));

  return (
    <FlashingBox>
      <div>Load the list and put first item in prop1 as side effect</div>
      <button disabled={loading} onClick={() => loadList()}>
        {loading ? 'loading...' : 'load list'}
      </button>
    </FlashingBox>
  );
}

function LoadFail() {
  const { loadAndFail, loading } = useStoreContextSlice(StoreContext, (ctx) => ({
    loadAndFail: ctx.loadAndFail,
    loading: ctx.loadingMap.loadAndFail,
  }));
  return (
    <FlashingBox>
      <div>Asynchronous load and fail and set "error" to prop2 as side effect</div>
      <button disabled={loading} onClick={() => loadAndFail(true)}>
        {loading ? 'loading...' : 'load (fail)'}
      </button>{' '}
      <button disabled={loading} onClick={() => loadAndFail(false)}>
        {loading ? 'loading...' : 'load (success)'}
      </button>
    </FlashingBox>
  );
}

function LoadCancel() {
  const { loadCancel, loading } = useStoreContextSlice(StoreContext, (ctx) => ({
    loadCancel: ctx.loadCancel,
    loading: ctx.loadingMap.loadCancel,
  }));

  return (
    <FlashingBox>
      <div>Asynchronous action, promise cancel (return null)</div>
      <button disabled={loading} onClick={() => loadCancel()}>
        {loading ? 'loading...' : 'load'}
      </button>
    </FlashingBox>
  );
}

function Prop2() {
  // all are identical
  // const s = useStoreSlice(myStore, (s) => ({ item: s.prop2, setItem: s.setProp2 }));
  // const s = useStoreSlice(myStore, (s) => pick(s, 'prop2', 'setProp2'));
  const s = useStoreContextSlice(StoreContext, ['prop2', 'setProp2']);

  return (
    <FlashingBox>
      <div>
        <div>prop2: {s.prop2}</div>
      </div>
      <div>
        <InputButton buttonLabel="Set Item" onAction={s.setProp2} />
      </div>
    </FlashingBox>
  );
}

function Prop3() {
  const s = useStoreContextSlice(StoreContext, ['prop3', 'setProp3']);

  return (
    <FlashingBox>
      <div>
        <div>After a debounce timeout, loadList as side effect</div>
        <div>prop3: {s.prop3}</div>
      </div>
      <div>
        <input value={s.prop3} onChange={(e) => s.setProp3(e.target.value)} />
      </div>
    </FlashingBox>
  );
}

function Prop3Debounced() {
  const s = useStoreContextSlice(StoreContext, ['prop3', 'setProp3Debounced']);

  return (
    <FlashingBox>
      <div>
        <div>Debounced the effects and not only the side effects</div>
        <div>prop3: {s.prop3}</div>
      </div>
      <div>
        <input value={s.prop3} onChange={(e) => s.setProp3Debounced(e.target.value)} />
      </div>
    </FlashingBox>
  );
}

// =================================

type InputButtonProps = {
  buttonLabel: string;
  onAction: (text: string) => void;
};

function InputButton(p: InputButtonProps) {
  const [text, setText] = useState('');

  const onSubmit = (e: any) => {
    e.preventDefault();
    p.onAction(text);
    setText('');
  };

  return (
    <form onSubmit={onSubmit}>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit">{p.buttonLabel}</button>
    </form>
  );
}
