import { Button, Box, CircularProgress } from '@mui/material';
import { useState } from 'react';
import useLocalStore, { ConflictPolicy, StoreConfig } from './sd';
import { setResIn } from './sd/helpers';

// TYPES ===============================

type User = {
  firstName: string;
  lastName: string;
};

type Props = { userId: string };
type State = { user: User | null };
type Actions = {
  getUser: () => Promise<User>;
};

const config: StoreConfig<State, Actions, Props> = {
  getInitialState: () => ({
    user: null,
  }),
  actions: {
    getUser: {
      conflictPolicy: ConflictPolicy.KEEP_LAST,
      getPromise: ({ p }) =>
        p.userId
          ? new Promise((resolve) => {
              window.setTimeout(resolve, 3000, {
                firstName: 'John',
                lastName: `Doe_${p.userId}`,
              });
            })
          : null,
      effects: setResIn('user'),
    },
  },
  onPropsChange: [
    {
      onMount: true,
      getDeps: (p) => [p.userId],
      sideEffects: ({ a }) => {
        a.getUser();
      },
    },
  ],
};

// CONTAINER ===========================

function UserViewer(p: Props) {
  const { state: s, loading } = useLocalStore(config, p);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <dl>
      <dt>First name:</dt>
      <dd>{s.user?.firstName}</dd>
      <dt>Last name:</dt>
      <dd>{s.user?.lastName}</dd>
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
