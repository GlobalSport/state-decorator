import { Button, Box, CircularProgress } from '@material-ui/core';
import React, { useState } from 'react';
import useLocalStore, { StoreActions, StoreOptions } from '../../src/index';

// TYPES ===============================

type User = {
  firstName: string;
  lastName: string;
};

type Props = { userId: string };
type State = { user: User };
type Actions = {
  getUser: () => Promise<User>;
};

// INITIAL STATE =======================

export function getInitialState(p: Props): State {
  return {
    user: null,
  };
}

// ACTIONS =============================

export const actions: StoreActions<State, Actions, Props> = {
  getUser: {
    getPromise: ({ p }) =>
      p.userId
        ? new Promise((resolve) => {
            window.setTimeout(resolve, 3000, {
              firstName: 'John',
              lastName: `Doe_${p.userId}`,
            });
          })
        : null,
    effects: ({ s, res: user }) => ({ ...s, user }),
  },
};

// CONTAINER ===========================

const options: StoreOptions<State, Actions, Props> = {
  onPropsChange: [
    {
      getDeps: (p) => [p.userId],
      sideEffects: ({ a }) => {
        a.getUser();
      },
      onMount: true,
    },
  ],
};

// BEFORE
// const options: StoreOptions<State, Actions, Props> = {
//   onMount: ({ a }) => {
//     a.getUser();
//   },

//   onPropsChange: [
//     {
//       getDeps: (p) => [p.userId],
//       sideEffects: ({ a }) => {
//         a.getUser();
//       },
//     },
//   ],
// };

function UserViewer(p: Props) {
  const { state: s, loading } = useLocalStore(getInitialState, actions, p, options);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <dl>
      <dt>First name:</dt>
      <dd>{s.user.firstName}</dd>
      <dt>Last name:</dt>
      <dd>{s.user.lastName}</dd>
    </dl>
  );
}

export default function PropsChangeOnMount() {
  const [userId, setUserId] = useState('user1');
  return (
    <div>
      <Box>
        <Button onClick={() => setUserId('user1')}>User 1</Button>
        <Button onClick={() => setUserId('user2')}>User 2</Button>
        <Button onClick={() => setUserId('user3')}>User 3</Button>
      </Box>
      <UserViewer userId={userId} />
    </div>
  );
}
