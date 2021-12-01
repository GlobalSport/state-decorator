import React, { createContext, useContext } from 'react';

import { Box, TextField, Typography } from '@material-ui/core';
import useLocalStore, { createStore, StoreActions, StoreApi, useGetLocalStore, useStoreSlice } from '../../dist';
import FlashingBox from './FlashingBox';

// === Type

type State = {
  item: string;
  item2: string;
};

type Actions = {
  setItem: (item: string) => void;
};

const getInitialState = () => ({ item: 'initialValue', item2: 'another state value' });

const actionsImpl: StoreActions<State, Actions> = {
  setItem: ({ s, args: [item] }) => ({ ...s, item }),
};

// === Components

// Case 1: useLocalStore

function StateContainer1() {
  const { state, actions } = useLocalStore(getInitialState, actionsImpl);

  return (
    <>
      <Box>
        <Typography>Local state</Typography>
        <Typography variant="caption">pass state and actions to children through props</Typography>
      </Box>
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
        <ItemInput1 {...p} />
        <DisplayItem1 {...p} />
        <DisplayItem1_2 {...p} />
      </Box>
    </FlashingBox>
  );
}

function DisplayItem1(p: State) {
  return <FlashingBox>value: {p.item}</FlashingBox>;
}
function DisplayItem1_2(p: State) {
  return <FlashingBox>value: {p.item2}</FlashingBox>;
}
function ItemInput1(p: State & Actions) {
  return (
    <FlashingBox>
      <TextField label="item" value={p.item} onChange={(e) => p.setItem(e.target.value)} />
    </FlashingBox>
  );
}

// Case 2: global store

const store = createStore(getInitialState, actionsImpl);
store.init(null);

function StateContainer2() {
  return (
    <>
      <Box>
        <Typography>Global state</Typography>
        <Typography variant="caption">
          use a store instance, children import store instance and extract slice from store
        </Typography>
      </Box>
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
      <TextField label="item" value={s.item} onChange={(e) => s.setItem(e.target.value)} />
    </FlashingBox>
  );
}

// Case 3: passthrough store

type Store = StoreApi<State, Actions, any>;

function StateContainer3() {
  const store = useGetLocalStore(getInitialState, actionsImpl);

  return (
    <>
      <Box>
        <Typography>Local state (ref)</Typography>
        <Typography variant="caption">
          pass local store to children using a prop, children extract slice from store
        </Typography>
      </Box>
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
      <TextField label="item" value={s.item} onChange={(e) => s.setItem(e.target.value)} />
    </FlashingBox>
  );
}

// Case 4: context

type StoreContextProps = { store: StoreApi<State, Actions, any> };

export const StoreContext = createContext<StoreContextProps>(null);

function StoreContextProvider(p: { children: any }) {
  const store = useGetLocalStore(getInitialState, actionsImpl);
  return <StoreContext.Provider value={{ store }}>{p.children}</StoreContext.Provider>;
}

function StateContainer4() {
  return (
    <>
      <Box>
        <Typography>Store in a context</Typography>
        <Typography variant="caption">
          context is exposing store, children get store from context and extract slice
        </Typography>
      </Box>
      <StoreContextProvider>
        <FlashingBox title="state container">
          <Layout4 />
        </FlashingBox>
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
  const { store } = useContext(StoreContext);
  const s = useStoreSlice(store, ['item']);
  return <FlashingBox>value: {s.item}</FlashingBox>;
}

function DisplayItem4_2() {
  const { store } = useContext(StoreContext);
  const s = useStoreSlice(store, ['item2']);
  return <FlashingBox>value: {s.item2}</FlashingBox>;
}

function ItemInput4() {
  const { store } = useContext(StoreContext);
  const s = useStoreSlice(store, ['item', 'setItem']);

  return (
    <FlashingBox>
      <TextField label="item" value={s.item} onChange={(e) => s.setItem(e.target.value)} />
    </FlashingBox>
  );
}

// === App

export default function DeepTree() {
  return (
    <Box>
      <Box>
        <StateContainer1 />
      </Box>
      <Box>
        <StateContainer2 />
      </Box>
      <Box>
        <StateContainer3 />
      </Box>
      <Box>
        <StateContainer4 />
      </Box>
    </Box>
  );
}
