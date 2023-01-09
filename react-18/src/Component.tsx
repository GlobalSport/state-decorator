import { startTransition, useState } from 'react';
import { createStore, StoreConfig, useStoreSlice } from './sd/es';

type State = {
  text: string;
};

type Actions = {
  setText: (text: string) => void;
};

const config: StoreConfig<State, Actions> = {
  getInitialState: () => ({ text: '', count: 0 }),
  actions: {
    setText: ({ args: [text] }) => ({ text }),
  },
};

const store = createStore(config);
store.init({});

//Application code

export const TextBox = () => {
  const { setText } = useStoreSlice(store, ['text', 'setText']);

  const handleValueChange = (e) => {
    startTransition(() => {
      setText(e.target.value);
    });
  };

  return (
    <div>
      <input onChange={handleValueChange} className="full-width" />
    </div>
  );
};

export const SlowValue = () => {
  const { text } = useStoreSlice(store, (ctx) => ({ text: ctx.text }));

  let now = performance.now();
  while (performance.now() - now < 10) {
    // do nothing
  }
  return <div>{text}</div>;
};
