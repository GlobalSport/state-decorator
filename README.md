![travis static](https://travis-ci.com/GlobalSport/state-decorator.svg?branch=master)

The StateDecorator is a React component that manages a local or global state.

# Features

- Easily testable (uses pure functions)
- Ease asynchronous actions state changes (loading state, success & error, optimistic updates...)
- Ease debugging (trace state changes)
- Improve code conciseness (no boiler plate code)
- Strongly typed

# Getting started

## Counter

The simpler example: the state is a literal value and two synchronous actions to change the state.

```typescript
import React from 'react';
import StateDecorator, { StateDecoratorActions } from 'state-decorator';

// The state, here a simple number
type State = number;

// The actions to change the state.
type Actions = {
  increment: () => void;
  decrement: () => void;
};

export const initialState: State = 0;

// Stateless component.
const CounterView: React.SFC<{ counter: number } & Actions> = ({ counter, increment, decrement }) => (
  <div>
    {counter}
    <button onClick={decrement}>Decrement</button>
    <button onClick={increment}>Increment</button>
  </div>
);

// Container that is managing the state.
export default class CounterContainer extends React.Component {
  // implementation of actions.
  static actions: StateDecoratorActions<State, Actions> = {
    decrement: (counter) => counter - 1,
    increment: (counter) => counter + 1,
  };

  render() {
    return (
      <StateDecorator<State, Actions> actions={CounterContainer.actions} initialState={initialState}>
        {(counter, actions) => <CounterView counter={counter} {...actions} />}
      </StateDecorator>
    );
  }
}
```

The StateDecorator is using the [render props pattern](https://reactjs.org/docs/render-props.html).
Ie. the children of the StateDecorator tag is a function that returns a React component.

# Types

The StateDecorator is a generic React component class that needs two interfaces: State and Actions.

- State: The interface of the state managed by the StateDecorator.
- Actions: The interface of the actions that will update the state.

# Initial state

The initial state is passed in the _initialState_ property of the StateDecorator.

```typescript
<StateDecorator<State, Actions> actions={MyContainer.actions} initialState={{ text: 'Hello' }}>
  {(actions, state) => <MyView {...state} {...actions} />}
</StateDecorator>
```

# Actions

The StateDecorator is taking a list of actions and decorate them to inject state, props, actions etc. and then expose to the child render prop the decorated actions that simply takes the function arguments.

## Initial action

When the StateDecorator is mounted, the **onMount** property is called with the decorated actions as parameter.

```typescript
export default class CounterContainer extends React.Component {
  static actions: StateDecoratorActions<State, Actions> = {
    initialAction: () => 100,
  };

  // initial action
  static onMount(actions: Actions) {
    actions.initialAction();
  }

  render() {
    return (
      <StateDecorator<State, Actions> actions={CounterContainer.actions} onMount={CounterContainer.onMount}>
        {(counter, actions) => <CounterView counter={counter} {...actions} />}
      </StateDecorator>
    );
  }
}
```

This is usually used to load asynchronous data to populate the state.

## Synchronous actions

A synchronous action is a function that takes the current state and an optional list of parameters and returns a new state or _null_ if there's no change.

```typescript
static actions: StateDecoratorActions<State, Actions> = {
  setText: (s, text: string, props: any) => ({ ...s, text })
};
```

## Asynchronous actions

An asynchronous action is made of, at least:

- a function that returns a promise

and

- a reducer (to use redux terminology), ie. a function that takes as parameter the old state, the result of the request, the list of call arguments and returns a new state or _null_ if there's no change.

```typescript
export default class MyContainer extends React.Component {
  static actions: StateDecoratorActions<State, Actions> = {
    loadList: {
      promise: () => new Promise((resolve) => setTimeout(resolve, 500, ['hello', 'world'])),
      reducer: (state, list, args, props) => ({ ...state, list }),
    },
  };

  // initial action on mount
  static onMount(actions: Actions) {
    actions.loadList();
  }

  render() {
    return (
      <StateDecorator<State, Actions>
        actions={MyContainer.actions}
        onMount={MyContainer.onMount}
        initialState={{ list: [] }}
      >
        {(state, actions, loading) => <MyView {...state} {...actions} loading={loading} />}
      </StateDecorator>
    );
  }
}
```

### Loading state

The loading state of asynchronous actions are automatically computed and injected to the render property.

```typescript
<StateDecorator actions={MyContainer.actions}>
  {(state, actions, loading, loadingMap) => (
    <MyView {...state} {...actions} loading={loading} loadingMap={loadingMap} />
  )}
</StateDecorator>
```

There are two properties:

- **loading**: the global loading state, ie. true if at least one asynchronous action is ongoing.
  - Note that optimistic actions are not taken into account.
- **loadingMap**: a map action name => loading state. The loading state can have 3 values:
  - undefined: the action was not called
  - true: the action is ongoing
  - false: the action has finished (successfully or not)
- **loadingParallelMap**: a map action name => list of promise identifiers. Used only of parallel actions, see [Conflicting actions](#ConflictingActions) section.

### Success / error notification

A notification function can be called when the asynchronous action succeeded or failed.

1. Pass a function to _notifySuccess_ and/or _notifyError_ properties of the StateDecorator.
2. In each asynchronous action, set

- _errorMessage_ (static message) or _getErrorMessage_ (message built from the error and action parameters)
- _successMessage_ (static message) or _getSuccessMessage_ (message built from the action result and parameters)

### Error management

When an asynchronous action fails, if the state needs to be updated, set the _errorReducer_ property of the asynchronous action.

```typescript
static actions: StateDecoratorActions<State, Actions> = {
  loadList: {
    promise: () => new Promise((_, reject) => setTimeout(reject, 500, new Error('Too bad'))),
    reducer: (state, list) => ({ ...state, list, error: undefined }),
    errorReducer: (state, error: Error) => ({ ...state, error: error.message, list: [] })
  }
};
```

**Note:** If an error message or an error reducer is defined, the error will be trapped to prevent other error management (console traces...). If, for any reason, you need to have the promise to be rejected, set _rejectPromiseOnError_ to _true_.

### Retry

If the action fails, the action can be retried a specified amount of times.

The following properties of an asynchronous action are used:

- **retryCount**: Number of retries in case of "retry error".
- **retryDelaySeed**: Seed of delay between each retry in milliseconds. The applied delay is retryDelaySeed \* retry count. Default is 1000ms.
- **isTriggerRetryError**: A function that returns if the passed error will trigger a retry or if the action fails directly. Default function is returning _true_ for _TypeError_ instances.

Note: _StateDecorator.isTriggerRetryError_ static function can be overridden to determine which error will trigger a retry globally.

### Optimistic action

An optimistic action assumes that the action will, most of the time, succeed. So it will apply a reducer as soon as the asynchronous action is called (as opposite to the regular reducer which is called when the promise is resolved).

If the action succeeds the reducer, if any, will be called anyway.

If the action fails, the state will be recomputed to undo this action.

The undo strategy is the following:

- Retrieve the state before the optimist action.
- Replay all the subsequent action reducers.
- If there are other optimistic actions ongoing, update their state before action.

Example:

```typescript
static actions: StateDecoratorActions<State, Actions> = {
  deleteItem: {
    promise: (id) => new Promise((resolve) => setTimeout(resolve, 500)),
    optimisticReducer: (state, args) => ({ ...state, list: list.filter(item => item.id === args[0]) }),
    errorReducer: (state, error: Error) => ({ ...state, error: error.message })
  }
};
```

**Note**: To update the state _before_ the action, prefer _preReducer_. _optimisticReducer_ purpose is optimistic actions only. Optimistic actions are not changing the global loading state and are a bit more expensive because the subsequent actions are saved in order to be able to revert the optimistic action in case of failure.

### <a name="ConflictingActions"></a>Conflicting actions

The StateDecorator is managing the asynchronous action calls one at a time or in parallel

In lots of situations, the UI is disabled using the _loading_ or _loadingMap_ parameters, but in other situation one may want to manage such use case (a search bar, autosave feature of an editor etc.).

When a action call occurs while another call of the same action is ongoing, we call such actions calls _conflicting actions_.

There are several policies to handles call to an action while there's a previous call to this action is ongoing.

This is controlled by the **conflictPolicy** property of an asynchronous action.

It can takes the following values (use ConflictPolicy enum), choose the one the more suited to your use case:

- **ConflictPolicy.IGNORE**: The conflicting action calls are simply ignored.
- **ConflictPolicy.REJECT**: Conflicting action calls are unwanted, they will be rejected with an error.
- **ConflictPolicy.KEEP_ALL**: All conflicting action calls will be chained and executed one after the other.
- **ConflictPolicy.KEEP_LAST** (default): Only the more recent conflicting action call will be executed after the previously ongoing call is resolved.
- **ConflictPolicy.PARALLEL**: Actions are executed in parallel.
  - A _getPromiseId_ function must be provided to assign an identifier to each call from call arguments.
  - The _loadingParallelMap_ of the render prop function contains for each parallel action the promise identifiers that are ongoing.

Run the "Conflicting actions" example.

_Note_: In conjunction to this parameter, you can use [lodash debounce](https://lodash.com/docs/4.17.10#debounce) to call actions every _n_ ms at most

# Chain actions

Synchronous and asynchronous actions can be chained.

- Synchronous actions can be chained naturally (one action after the other) in the user code.
- Asynchronous actions can internally call another action. The promise provider function has the decorated actions in parameter (see [API](#API)) so they can return a promise by calling another action.
- To chain an asynchronous action to a synchronous action, create a new asynchronous action that will call the synchronous action and returns the asynchronous action.

```typescript
import React from 'react';
import StateDecorator, { StateDecoratorActions } from 'state-decorator';

interface Item {
  id?: string;
  value: string;
}

export type State = {
  items: Item[];
};

export type Actions = {
  getItems: () => Promise<Item[]>;
  addItem: (item: Item) => Promise<any>;
};

export const getInitialState = (): State => ({
  items: [],
});

class APIClient {
  static getItems(): Promise<Item[]> {
    return Promise.resolve([]);
  }
  // addItem is silly and is not returning the created object!!
  static addItem(item: Item): Promise<any> {
    return Promise.resolve();
  }
}

export default class ChainContainer extends React.PureComponent<{}> {
  static actions: StateDecoratorActions<State, Actions> = {
    getItems: {
      promise: () => APIClient.getItems(),
      reducer: (s, list) => ({ ...s, list }),
    },
    addItem: {
      // As addItem is silly, we must reload the list after having added the item...
      promise: (item: Item, state, props, actions: Actions) => APIClient.addItem(item).then(() => actions.getItems()),
      // No reducer needed, the getItems decorated action will call its own reducer
    },
  };

  render() {
    return (
      <StateDecorator<State, Actions> actions={ChainContainer.actions} initialState={getInitialState()}>
        {(state, actions) => <div />}
      </StateDecorator>
    );
  }
}
```

# Update the state after a prop change

The _props_ property of the StateDecorator is passed to nearly all action callbacks. It's usually used to pass some context data.

Sometimes the state is built from one of several _props_. If one of these props change the state must be recomputed.

3 props of the StateDecorator are used for this.

- **getPropsRefValues**: a function that computes from the props the reference values that will be used to detect a prop change. For example: `(p) => [p.item.id];`
- **onPropsChangeReducer**: a reducer function to update the state from new props. For example: `(state, props) => ({...state, item: {...props.item})`
- **onPropsChange**: a callback to trigger an action. For example: `(state, props, actions) => actions.loadData(props.id)`. The reducer of the _loadData_ action will then update the state.

# Debug actions

The StateDecorator has a _logEnabled_ property that logs in the Browser console the actions and related state changes.

```
[StateDecorator] Action onCalendarTimeRangeChange
 ▼ Arguments
 ║ 0 : 2018-08-12T22:00:00.000Z
 ║ 1 : 2018-08-19T22:00:00.000Z
 ▶ Before
 ▶ After
 ▼ Diff
 ║ calendarStartDate : null => 2018-08-12T22:00:00.000Z
 ║ calendarEndDate : null => 2018-08-19T22:00:00.000Z
```

# Unit testing

A major advantage of the StateDecorator is to decouple the state management from the UI rendering so they can be tested separately.

The UI rendering is tested using [Enzyme](https://github.com/airbnb/enzyme) as usual.
As the view component is not managing a state, just test the rendering depending on the props.

To test the state, a simple JS test framework is needed (Jest, Mocha, Jasmine...).

If the asynchronous action is processing the result before passing it to the reducer, you can mock the http calls and test the action promise.

The synchronous actions and the asynchronous reducers are all pure functions, ie. all the data you need is provided by the user (arguments) or injected (state & props).

## Example

### Class

```typescript
export class MyContainer extends React.Component {
  static actions: StateDecoratorActions<State, Actions> = {
    loadList: {
      promise: () => new Promise((_, reject) => setTimeout(reject, 500, new Error('Too bad'))),
      reducer: (state, list: Item[]): State => ({ ...state, list }),
    },
    addItem: {
      promise: (item: Item) => Promise.resolve(),
      optimisticReducer: (s, [item]: Item[]): State => ({ ...s, list: [...s.list, item] }),
    },
    removeItem: {
      promise: (id: string) => Promise.resolve(),
      optimisticReducer: (s, [id]): State => ({ ...s, list: s.list.filter((i) => i.id !== id) }),
    },
  };

  render() {
    return (
      <StateDecorator<State, Actions> actions={MyContainer.actions} initialState={{ list: [] }}>
        {(state, actions, loading) => <MyView {...state} {...actions} loading={loading} />}
      </StateDecorator>
    );
  }
}
```

## Test

This example is using [Jest](https://jestjs.io/).

```typescript
const actions: StateDecoratorActions<State, Actions> = MyContainer.actions;

describe('MyContainer', () => {
  describe('loadList', () => {
    it('reducer add list to state', () => {
      const initialState = { list: [] };
      const list = [{ id: '1', value: 'item1' }, { id: '2', value: 'item2' }];

      const newState = actions.loadList.reducer(initialState, list);

      expect(newState.list).toBe(list);
    });
  });
  describe('addItem', () => {
    it('reducer add item list correctly', () => {
      const list = [{ id: '1', value: 'item1' }, { id: '2', value: 'item2' }];
      const item = { id: '3', value: 'item3' };
      const initialState = { list };

      const newState = actions.addItem.optimisticReducer(initialState, [item]);

      expect(newState.list).not.toBe(list);
      expect(newState.list).toHaveLength(3);
      expect(newState.list[0].id).toBe('1');
      expect(newState.list[1].id).toBe('2');
      expect(newState.list[2].id).toBe('3');
    });
  });
  describe('removeItem', () => {
    it('reducer remove item from list correctly', () => {
      const list = [{ id: '1', value: 'item1' }, { id: '2', value: 'item2' }, { id: '3', value: 'item3' }];
      const initialState = { list };

      const newState = actions.removeItem.optimisticReducer(initialState, ['2']);

      expect(newState.list).not.toBe(list);
      expect(newState.list).toHaveLength(2);
      expect(newState.list[0].id).toBe('1');
      expect(newState.list[1].id).toBe('3');
    });
  });
});
```

### Result

```
PASS  tests/MyContainer.test.tsx
  MyContainer
    loadList
      ✓ reducer add list to state (3ms)
    addItem
      ✓ reducer add item list correctly (2ms)
    removeItem
      ✓ reducer remove item from list correctly

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        1.814s
```

# Immutability

- Immutability: each action/reducer **must** return a new state instance (or **null** if there's no change).
- Pure components: thanks to immutability, React can detect that some renders are not needed if you are using React.PureComponent. See [React.PureComponent API](https://reactjs.org/docs/react-api.html#reactpurecomponent)

You can use immutable libraries in your state / reducers to help you manage immutability.
Then, use PureComponents in the StateDecorator child component tree to prevent useless renderings.

# Global state

The [React 16 context API](https://reactjs.org/docs/context.html) can be used to use the StateDecorator to manage the global state and thus allow injection in a component deeper in the component tree.

```typescript
import React from 'react';
import StateDecorator, { StateDecoratorActions } from 'state-decorator';

export type State = {
  color: string;
};

export type Actions = {
  setColor: (color: string) => void;
};

const initialState = { color: 'blue' };

export const Context = React.createContext<State & Actions>(null);

// SubComponent will retrieve the color from the context.
class SubComponent extends React.Component {
  render() {
    return (
      <Context.Consumer>
        {(context) => (
          <div>
            <div className="sub-component">{context.color}</div>
            <button onClick={() => context.setColor('red')}>Click</button>
          </div>
        )}
      </Context.Consumer>
    );
  }
}

// Main component does not have the color property.
const MainComponent = () => <SubComponent />;

export default class ContextContainer extends React.Component {
  static actions: StateDecoratorActions<State, Actions> = {
    setColor: (s, color) => ({ ...s, color }),
  };
  render() {
    return (
      <StateDecorator<State, Actions> actions={ContextContainer.actions} initialState={initialState}>
        {(state, actions) => (
          <Context.Provider
            value={{
              ...state,
              ...actions,
            }}
          >
            <MainComponent />
          </Context.Provider>
        )}
      </StateDecorator>
    );
  }
}
```

# Limitations

- Due to bundle size constraints and used in specific use cases only, _fast-clone_ library is used to clone state / props / arguments in conflicting actions and optimistic reducer use cases. In some edge cases, _fast-clone_ will fail. In that case, use Lodash cloneDeep implementation:

```typescript
import cloneDeep from 'lodash.cloneDeep';
import StateDecorator from 'state-decorator';

StateDecorator.clone = cloneDeep;
```

- "Index signature is missing in type" or "'XxxXxx' does not satisfy the constraint 'DecoratedActions'" error during TS compilation:
  - https://github.com/Microsoft/TypeScript/issues/15300
  - Solution: the **Actions** interface must either extends **DecoratedActions** interface or be a **type**.

# StateDecorator & Redux comparison

The StateDecorator is like Redux (and others) a state management tool.
They both have pros and cons and can be use at the same time (Redux for global state and StateDecorator for local states).

## State cleaning

Redux state is global and stays until you explicitly implement send an action to clear the data.

The StateDecorator is local to the component where it's used. If the component is unmounted the entire state attached to this component is removed.

## Messages and decoupling

Redux is based on actions which are messages:

- The advantage is a decoupling that allows to reuse the actions (and middleware) anywhere in the app
- The downside is that you have to create lots of code for action, action creators, action types...

Most of the time, in real life cases, such extended decoupling is not really needed.

The StateDecorator is based on directly on reducers:

- The advantage is far simpler code, in a single place (easier to browse).
- The downside is that there's no middleware.

## State injection

The state managed by Redux is global by nature and must be injected using the **connect** function.

The StateDecorator state and actions can be injected using new React context API or just be local and use props.

## Asynchronous actions

Usually Redux developers create 3 actions to handle one asynchronous action: loading / success / error which results in lots of code.

If you are in that case, you can use [redux promise middleware](https://github.com/pburtchaell/redux-promise-middleware) to write less code.

To handle optimistic asynchronous actions, another middleware is needed like [redux optimistic](https://github.com/ForbesLindesay/redux-optimist).

The StateDecorator has these feature built-in.

## <a name="API"></a>API

_State_ is the generic state class passed to the StateDecorator.
_Actions_ is the generic actions class passed to the StateDecorator.

### StateDecorator properties

| Property             | Description                                                                                                                                                 | Type                                                                                                    | Mandatory | Default value |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------- | ------------- |
| actions              | The actions to decorate and pass to the child render property.                                                                                              | { [actionName: string]: SynchAction \| AsynchAction}                                                    | true      |               |
| initialState         | The initial state.                                                                                                                                          | State                                                                                                   |           |               |
| props                | Additional properties injected to reducers .                                                                                                                | any                                                                                                     |           |               |
| logEnabled           | If **true**, logs state changes to the console.                                                                                                             | boolean                                                                                                 |           | false         |
| notifyError          | Callback function triggered when an asynchronous actions fails and an error message is provided.                                                            | (message: string) => void                                                                               |           |               |
| notifySuccess        | Callback function triggered when an asynchronous actions succeeds and an success message is provided.                                                       | (message: string) => void                                                                               |           |               |
| onMount              | Function to invoke when the StateDecorator is mounted. Used to execute initial actions.                                                                     | (actions: DecoratedActions) => void                                                                     |           |               |
| children             | The child of the StateDecorator is a function that renders a component tree.                                                                                | (state: State, actions: Actions, loading: boolean, loadingMap: {[name: string]:boolean}) => JSX.Element | true      |               |
| getPropsRefValues    | Get a list of values that will be use as reference values. If they are different (shallow compare), onPropsChangeReducer then onPropsChange will be called. | (s: State, newProps: any) => State;                                                                     |           |               |
| onPropsChangeReducer | Triggered when values of reference from props have changed. Allow to update state after a prop change.                                                      | (s: State, newProps: any) => State;                                                                     |           |               |  |
| onPropsChange        | Triggered when values of reference from props have changed. Allow to call actions after a prop change.                                                      | (s: State, newProps: any, actions: Actions) => void;                                                    |           |               |  |

### Synchronous action

Type:

```
(state: State, ...args: any[], props: any) => State | null;
```

### Asynchronous action

| Property             | Description                                                                                                                                                                                                                             | Type                                                                         | Mandatory                                                     | Default value                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| promise              | The asynchronous action promise provider.                                                                                                                                                                                               | (...args: any[], state:State, props: any, actions:Actions) => Promise<any>   | true                                                          |                                           |
| preReducer           | The state update function triggered before optimisticReducer and the promise provider                                                                                                                                                   | (state: State, args: any[], props: any) => State \| null                     |                                                               |                                           |
| reducer              | The state update function triggered when the promise is resolved.                                                                                                                                                                       | (state: State, promiseResult: any, args: any[], props: any) => State \| null |                                                               |                                           |
| errorReducer         | The state update function triggered when the promise is rejected.                                                                                                                                                                       | (state: State, error: any, args: any[], props: Props) => State \| null       |                                                               |                                           |
| optimisticReducer    | The state update function triggered when promise started                                                                                                                                                                                | (state: State, args: any[], props: Props) => State \| null                   |                                                               |                                           |
| onDone               | Callback executed when the promise is resolved.                                                                                                                                                                                         | (state: State, promiseResult: any, args: any[], props: Props) => void        |                                                               |                                           |
| successMessage       | Success message provided to the **notifySuccess** function of the StateDecorator                                                                                                                                                        | string                                                                       |                                                               |                                           |
| getSuccessMessage    | Success message provider function to pass to the **notifySuccess** function of the StateDecorator                                                                                                                                       | (promiseResult: any, args: any[], props: Props) => string                    |                                                               |                                           |
| errorMessage         | Error message provided to the **notifyError** function of the StateDecorator                                                                                                                                                            |                                                                              |                                                               |                                           |
| getErrorMessage      | Error message provider function to pass to the **notifyError** function of the StateDecorator                                                                                                                                           |                                                                              |                                                               |                                           |
| rejectPromiseOnError | When an errorReducer or an error message is provided the outer promise is marked as resolved to prevent error in console or other error management. Set this property to true to reject the promise and process it in a catch function. | boolean                                                                      |                                                               | false                                     |
| conflictPolicy       | Policy to apply when a call to an asynchronous action is done but a previous call is still not resolved.                                                                                                                                | ConflictPolicy                                                               |                                                               | ConflictPolicy.KEEP_LAST                  |
| getPromiseId         | A function that returns the promise identifier from the arguments.                                                                                                                                                                      | (...args:any[]) => string                                                    | Mandatory if conflictPolicy is set to ConflictPolicy.PARALLEL |                                           |
| retryCount           | Number of tentative call to promise function.                                                                                                                                                                                           | number                                                                       |                                                               | 0                                         |
| retryDelaySeed       | Seed of delay between each retry in milliseconds. The applied delay is retryDelaySeed x retry count.                                                                                                                                    | number                                                                       |                                                               | 1000                                      |
| isTriggerRetryError  | Function to test if the error will trigger an action retry or will fail directly.                                                                                                                                                       | (e:Error) => boolean                                                         |                                                               | A function that tests TypeError instances |

# Examples

## TodoMVC

Synchronous actions, complex state with normalized storage of todo list.

```typescript
import React from 'react';
import StateDecorator, { StateDecoratorActions } from 'state-decorator';
import produce from 'immer';

enum Filter {
  ALL = 'all',
  COMPLETED = 'completed',
  NON_COMPLETED = 'non_completed',
}

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

export type State = {
  todoMap: { [id: string]: TodoItem };
  todoIds: string[];
  idCount: number;
  newTitle: string;
  filter: Filter;
};

export const getInitialState = (): State => ({
  todoMap: {},
  todoIds: [],
  idCount: 0,
  newTitle: '',
  filter: Filter.ALL,
});

export type Actions = {
  onCreate: () => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onClearCompleted: () => void;
  onSetNewTitle: (title) => void;
  onSetFilter: (filter: Filter) => void;
};

class Header extends React.PureComponent<Pick<State, 'newTitle'> & Pick<Actions, 'onSetNewTitle' | 'onCreate'>> {
  onChange = (e) => this.props.onSetNewTitle(e.target.value);
  onSubmit = (e) => {
    e.preventDefault();
    this.props.onCreate();
  };
  render() {
    const { newTitle } = this.props;
    return (
      <form onSubmit={this.onSubmit}>
        <input value={newTitle} onChange={this.onChange} />
        <button type="submit">Create</button>
      </form>
    );
  }
}

class Todo extends React.PureComponent<{ todo: TodoItem } & Actions> {
  onToggle = (e) => this.props.onToggle(this.props.todo.id);

  render() {
    const { todo } = this.props;
    return (
      <div>
        <div>{todo.title}</div>
        <label>
          <input type="checkbox" checked={todo.completed} onChange={this.onToggle} />
          completed
        </label>
      </div>
    );
  }
}

class Todos extends React.PureComponent<Pick<State, 'todoIds' | 'todoMap' | 'filter'> & Actions> {
  filter = (todoId) => {
    const { filter, todoMap } = this.props;
    const todo = todoMap[todoId];

    if (filter === Filter.ALL) {
      return true;
    }

    return filter === Filter.COMPLETED ? todo.completed : !todo.completed;
  };

  render() {
    const { todoIds, todoMap } = this.props;

    return (
      <div>
        {todoIds.filter(this.filter).map((todoId) => (
          <Todo key={todoId} todo={todoMap[todoId]} {...this.props} />
        ))}
      </div>
    );
  }
}

class Footer extends React.PureComponent<Pick<State, 'filter'> & Actions> {
  onFilterChange = (e) => this.props.onSetFilter(e.target.value);

  render() {
    const { onClearCompleted, filter } = this.props;
    return (
      <div>
        <label>
          <input
            type="radio"
            name="filter"
            value={Filter.ALL}
            checked={filter === Filter.ALL}
            onChange={this.onFilterChange}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="filter"
            value={Filter.NON_COMPLETED}
            checked={filter === Filter.NON_COMPLETED}
            onChange={this.onFilterChange}
          />
          Non Completed
        </label>
        <label>
          <input
            type="radio"
            name="filter"
            value={Filter.COMPLETED}
            checked={filter === Filter.COMPLETED}
            onChange={this.onFilterChange}
          />
          Completed
        </label>
        <button onClick={onClearCompleted}>Clear completed</button>
      </div>
    );
  }
}
// Container that is managing the state.
export default class TodoContainer extends React.Component {
  static actions: StateDecoratorActions<State, Actions> = {
    onCreate: (state) =>
      produce<State>(state, (draftState) => {
        const newTodo: TodoItem = {
          title: state.newTitle,
          id: `${draftState.idCount}`,
          completed: false,
        };
        draftState.idCount++;
        draftState.todoMap[newTodo.id] = newTodo;
        draftState.todoIds.push(newTodo.id);
        draftState.newTitle = '';
      }),

    onEdit: (state, id: string, title: string) =>
      produce<State>(state, (draftState) => {
        draftState.todoMap[id].title = title;
      }),

    onDelete: (state, id: string) =>
      produce<State>(state, (draftState) => {
        delete draftState.todoMap[id];
        draftState.todoIds = draftState.todoIds.filter((todoId) => todoId !== id);
      }),

    onToggle: (state, id: string) =>
      produce<State>(state, (draftState) => {
        const todo = draftState.todoMap[id];
        todo.completed = !todo.completed;
      }),

    onClearCompleted: (state) =>
      produce<State>(state, (draftState) => {
        draftState.todoIds = draftState.todoIds.filter((id) => {
          const todo = draftState.todoMap[id];
          if (todo.completed) {
            delete draftState.todoMap[todo.id];
          }
          return !todo.completed;
        });
      }),

    onSetNewTitle: (s, newTitle) => ({
      ...s,
      newTitle,
    }),

    onSetFilter: (s, filter) => ({
      ...s,
      filter,
    }),
  };

  render() {
    return (
      <StateDecorator<State, Actions> actions={TodoContainer.actions} initialState={getInitialState()}>
        {(state, actions) => (
          <div>
            <Header {...actions} newTitle={state.newTitle} />
            <Todos {...actions} todoIds={state.todoIds} todoMap={state.todoMap} filter={state.filter} />
            <Footer {...actions} filter={state.filter} />
          </div>
        )}
      </StateDecorator>
    );
  }
}
```

## Conflicting actions

Show various ways of handling conflicting actions, ie. asynchronous actions triggered when a previous action of same type is still ongoing.

```typescript
import React from 'react';
import StateDecorator, { StateDecoratorActions } from 'state-decorator';

export type State = {
  counter: number;
  text: string;
};

export type Actions = {
  updateText: (text) => Promise<string>;
};

export const getInitialState = (): State => ({
  counter: 0,
  text: '',
});

interface Props {
  title: string;
  conflictPolicy: ConflictPolicy;
}

class ConflictingActionsContainer extends React.PureComponent<Props> {
  actions: StateDecoratorActions<State, Actions> = {
    updateText: {
      promise: (text: string) => new Promise((res) => setTimeout(res, 1000, text)),
      reducer: (s, text) => ({ ...s, text, counter: s.counter + 1 }),
      conflictPolicy: this.props.conflictPolicy,
      debounceTimeout: 250,
    },
  };

  render() {
    const { title } = this.props;
    return (
      <StateDecorator<State, Actions> actions={this.actions} initialState={getInitialState()}>
        {({ counter, text }, actions) => (
          <div style={{ border: '1px solid grey', marginBottom: 10 }}>
            <h2>{title}</h2>
            <div>
              <input onChange={(e) => actions.updateText(e.target.value)} />
            </div>
            <div>Server calls #: {counter}</div>
            <div>Server state: {text}</div>
          </div>
        )}
      </StateDecorator>
    );
  }
}

export default class ConflictApp extends React.Component {
  render() {
    return (
      <div>
        <ConflictingActionsContainer title="Keep All" conflictPolicy={ConflictPolicy.KEEP_ALL} />
        <ConflictingActionsContainer title="Keep Last" conflictPolicy={ConflictPolicy.KEEP_LAST} />
        <ConflictingActionsContainer title="Ignore" conflictPolicy={ConflictPolicy.IGNORE} />
        <ConflictingActionsContainer title="Reject" conflictPolicy={ConflictPolicy.REJECT} />
      </div>
    );
  }
}
```

## Parallel actions

The _onChange_ action calls are executed in parallel. The map of ongoing action calls is available on _loadingParallelMap_.

```typescript
import React from 'react';
import StateDecorator, { StateDecoratorActions, ConflictPolicy } from 'state-decorator';
import produce from 'immer';

type Item = {
  id: string;
  value: string;
};

export type State = {
  items: Item[];
};

export type Actions = {
  onChange: (id: string, value: string) => Promise<any>;
};

export const getInitialState = (): State => ({
  items: [
    {
      id: 'user1',
      value: '',
    },
    {
      id: 'user2',
      value: '',
    },
    {
      id: 'user3',
      value: '',
    },
    {
      id: 'user4',
      value: '',
    },
  ],
});

export default class ParallelActions extends React.PureComponent {
  static actions: StateDecoratorActions<State, Actions> = {
    onChange: {
      promise: (id, value) => new Promise((res) => setTimeout(res, 3000, value)),
      conflictPolicy: ConflictPolicy.PARALLEL,
      getPromiseId: (id) => id,
      reducer: (s, value, [id]) =>
        produce(s, ({ items }) => {
          items.find((i) => i.id === id).value = value;
        }),
    },
  };

  render() {
    return (
      <StateDecorator actions={ParallelActions.actions} initialState={getInitialState()}>
        {({ items }, { onChange }, loading, loadingMap, loadingParallelMap) => (
          <div style={{ border: '1px solid grey', marginBottom: 10 }}>
            {items.map((item) => {
              const isItemLoading = loadingParallelMap.onChange[item.id];
              return (
                <div key={item.id}>
                  {item.id}
                  <input
                    onBlur={(e) => onChange(item.id, e.target.value)}
                    disabled={isItemLoading}
                    style={{ backgroundColor: isItemLoading ? 'grey' : null }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </StateDecorator>
    );
  }
}
```

# VS Code User snippet

A VS Code snippet to create a class that have a state controlled by a StateDecorator.

Add this code to File > Preferences > User snippets > typescriptreact.json

```json
{
  "Create StateDecorator types": {
    "prefix": "rclassStateDecorator",
    "body": [
      "export type State = {",
      "  $1",
      "};",
      "",
      "export type Actions = {",
      "  $2",
      "};",
      "",
      "export const getInitialState = ():State => ({",
      "  $3",
      "});",
      "",
      "export default class $4 extends React.PureComponent<$5> {",
      "  static actions: StateDecoratorActions<State, Actions> = {",
      "    $6",
      "  };",
      "",
      "  static onMount(actions:Actions) {",
      "    $7",
      "  }",
      "",
      "  render() {",
      "    return (",
      "      <StateDecorator<State, Actions>",
      "        actions={$4.actions}",
      "        initialState={getInitialState()}",
      "        onMount={$4.onMount}",
      "      >",
      "        {(state, actions) => <div/>$0}",
      "      </StateDecorator>",
      "    );",
      "  }",
      "}"
    ],
    "description": "Create a new StateDecorator'ed class"
  }
}
```
