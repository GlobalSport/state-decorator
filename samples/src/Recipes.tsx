import React, { createContext, memo } from 'react';

import { Box, TextField, Typography } from '@mui/material';
import useLocalStore, { createStore, StoreApi, useStoreSlice, useStoreContextSlice, StoreConfig } from './sd_src';
import FlashingBox from './FlashingBox';
import { setArgIn } from './sd/helpers';

// === Type

type State = {
  item: string;
  item2: string;
};

type Actions = {
  setItem: (item: string) => void;
};

const storeConfig: StoreConfig<State, Actions> = {
  getInitialState: () => ({ item: 'initialValue', item2: 'another state value' }),
  actions: {
    setItem: setArgIn('item'),
  },
};

// === Components

// Case 1: useLocalStore

function StateContainer1() {
  const { state, actions } = useLocalStore(storeConfig);

  return (
    <>
      <FlashingBox title="state container">
        <Layout1 {...state} {...actions} />
      </FlashingBox>
    </>
  );
}

function Layout1(p: State & Actions) {
  return (
    <FlashingBox title="layout component">
      <Box>
        <ItemInput1 item={p.item} setItem={p.setItem} />
        <DisplayItem1 item={p.item} />
        <DisplayItem1_2 item2={p.item2} />
      </Box>
    </FlashingBox>
  );
}

const DisplayItem1 = memo(function DisplayItem1(p: Pick<State, 'item'>) {
  return <FlashingBox>value: {p.item}</FlashingBox>;
});

const DisplayItem1_2 = memo(function DisplayItem1_2(p: Pick<State, 'item2'>) {
  return <FlashingBox>value: {p.item2}</FlashingBox>;
});
const ItemInput1 = memo(function ItemInput1(p: Pick<State, 'item'> & Pick<Actions, 'setItem'>) {
  return (
    <FlashingBox>
      <TextField size="small" label="item" value={p.item} onChange={(e) => p.setItem(e.target.value)} />
    </FlashingBox>
  );
});

// Case 2: global store

const store = createStore(storeConfig);
store.init(null);

function StateContainer2() {
  return (
    <>
      <FlashingBox title="state container">
        <Layout2 />
      </FlashingBox>
    </>
  );
}

function Layout2(p: {}) {
  return (
    <FlashingBox title="layout component">
      <Box>
        <ItemInput2 />
        <DisplayItem2 />
        <DisplayItem2_2 />
      </Box>
    </FlashingBox>
  );
}

function DisplayItem2(p: {}) {
  const s = useStoreSlice(store, ['item']);
  return <FlashingBox>value: {s.item}</FlashingBox>;
}

function DisplayItem2_2(p: {}) {
  const s = useStoreSlice(store, ['item2']);
  return <FlashingBox>value: {s.item2}</FlashingBox>;
}

function ItemInput2(p: {}) {
  const s = useStoreSlice(store, ['item', 'setItem']);

  return (
    <FlashingBox>
      <TextField size="small" label="item" value={s.item} onChange={(e) => s.setItem(e.target.value)} />
    </FlashingBox>
  );
}

// Case 3: passthrough store

type Store = StoreApi<State, Actions, any>;

function StateContainer3() {
  const store = useLocalStore(storeConfig, null, false);

  return (
    <>
      <FlashingBox title="state container">
        <Layout3 store={store} />
      </FlashingBox>
    </>
  );
}

function Layout3(p: { store: Store }) {
  return (
    <FlashingBox title="layout component">
      <Box>
        <ItemInput3 store={p.store} />
        <DisplayItem3 store={p.store} />
        <DisplayItem3_2 store={p.store} />
      </Box>
    </FlashingBox>
  );
}

function DisplayItem3(p: { store: Store }) {
  const s = useStoreSlice(p.store, ['item']);
  return <FlashingBox>value: {s.item}</FlashingBox>;
}

function DisplayItem3_2(p: { store: Store }) {
  const s = useStoreSlice(p.store, ['item2']);
  return <FlashingBox>value: {s.item2}</FlashingBox>;
}

function ItemInput3(p: { store: Store }) {
  const s = useStoreSlice(p.store, ['item', 'setItem']);

  return (
    <FlashingBox>
      <TextField size="small" label="item" value={s.item} onChange={(e) => s.setItem(e.target.value)} />
    </FlashingBox>
  );
}

// Case 4: context

export const StoreContext = createContext<StoreApi<State, Actions, any>>(null);

function StoreContextProvider(p: { children: any }) {
  // last parameter prevents a refresh of the StoreContextProvider component
  const store = useLocalStore(storeConfig, null, false);
  return (
    <FlashingBox title="state container">
      <StoreContext.Provider value={store}>{p.children}</StoreContext.Provider>
    </FlashingBox>
  );
}

function StateContainer4() {
  return (
    <>
      <StoreContextProvider>
        <Layout4 />
      </StoreContextProvider>
    </>
  );
}

function Layout4() {
  return (
    <FlashingBox title="layout component">
      <Box>
        <ItemInput4 />
        <DisplayItem4 />
        <DisplayItem4_2 />
      </Box>
    </FlashingBox>
  );
}

function DisplayItem4() {
  const s = useStoreContextSlice(StoreContext, ['item']);
  return <FlashingBox>value: {s.item}</FlashingBox>;
}

function DisplayItem4_2() {
  const s = useStoreContextSlice(StoreContext, ['item2']);
  return <FlashingBox>value: {s.item2}</FlashingBox>;
}

function ItemInput4() {
  const s = useStoreContextSlice(StoreContext, ['item', 'setItem']);

  return (
    <FlashingBox>
      <TextField size="small" label="item" value={s.item} onChange={(e) => s.setItem(e.target.value)} />
    </FlashingBox>
  );
}

// === App

export default function DeepTree() {
  return (
    <Box>
      <Box>
        <Typography>Local state</Typography>
        <Typography variant="caption">pass state and actions to children through props + memo</Typography>
      </Box>
      <Box display="flex">
        <StateContainer1 />
        <StateContainer1 />
      </Box>
      <Box>
        <Typography>Global state</Typography>
        <Typography variant="caption">
          use a store instance, children import store instance and extract slice from store
        </Typography>
      </Box>
      <Box display="flex">
        <StateContainer2 />
        <StateContainer2 />
      </Box>
      <Box>
        <Typography>Local state (ref)</Typography>
        <Typography variant="caption">
          pass local store to children using a prop, children extract slice from store
        </Typography>
      </Box>
      <Box display="flex">
        <StateContainer3 />
        <StateContainer3 />
      </Box>
      <Box>
        <Typography>Store in a context</Typography>
        <Typography variant="caption">
          context is exposing store, children get store from context and extract slice
        </Typography>
      </Box>
      <Box display="flex">
        <StateContainer4 />
        <StateContainer4 />
      </Box>
    </Box>
  );
}
