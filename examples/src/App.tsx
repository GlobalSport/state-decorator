import React from 'react';
import TodoContainer from './todo/Todos';
import ConflictingActionsApp from './conflict/ConflictingActions';
import CounterContainer from './counter/Counter';
import Retry from './retry/Retry';
import PropsChangeApp from './propsChange/PropsChange';
import WrappedComponent from './hoc/WrappedComponent';
import ContextContainer from './context/Context';
import Debounce from './debounce/Debounce';
import { Card, CardHeader, CardContent } from '@material-ui/core';
import useCommonStyles from './style.js';

const App = () => {
  const classes = useCommonStyles();

  return (
    <div className={classes.app}>
      <div className={classes.container}>
        <Card className={classes.card}>
          <CardHeader className={classes.cardHeader} title="Debounce" />
          <CardContent>
            <Debounce />
          </CardContent>
        </Card>
        <Card className={classes.card}>
          <CardHeader className={classes.cardHeader} title="Counter" />
          <CardContent>
            <CounterContainer />
          </CardContent>
        </Card>
        <Card className={classes.card}>
          <CardHeader className={classes.cardHeader} title="Context" />
          <CardContent>
            <ContextContainer />
          </CardContent>
        </Card>
        <Card className={classes.card}>
          <CardHeader className={classes.cardHeader} title="Retry" />
          <CardContent>
            <Retry />
          </CardContent>
        </Card>
        <Card className={classes.card}>
          <CardHeader className={classes.cardHeader} title="Props change" />
          <CardContent>
            <PropsChangeApp />
          </CardContent>
        </Card>
        <Card className={classes.card}>
          <CardHeader className={classes.cardHeader} title="HOC" />
          <CardContent>
            <WrappedComponent value={10} />
          </CardContent>
        </Card>
      </div>
      <div className={classes.container} />
      <Card className={classes.card}>
        <CardHeader className={classes.cardHeader} title="Todo" />
        <CardContent>
          <TodoContainer />
        </CardContent>
      </Card>
      <section>
        <h1>Conflict</h1>
        <ConflictingActionsApp />
      </section>
    </div>
  );
};

export default App;
