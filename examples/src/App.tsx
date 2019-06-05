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
  const commonClasses = useCommonStyles();

  return (
    <div className={commonClasses.app}>
      <div className={commonClasses.container}>
        <Card className={commonClasses.card}>
          <CardHeader className={commonClasses.cardHeader} title="Debounce" />
          <CardContent>
            <Debounce />
          </CardContent>
        </Card>
        <Card className={commonClasses.card}>
          <CardHeader className={commonClasses.cardHeader} title="Counter" />
          <CardContent>
            <CounterContainer />
          </CardContent>
        </Card>
        <Card className={commonClasses.card}>
          <CardHeader className={commonClasses.cardHeader} title="Context" />
          <CardContent>
            <ContextContainer />
          </CardContent>
        </Card>
        <Card className={commonClasses.card}>
          <CardHeader className={commonClasses.cardHeader} title="Retry" />
          <CardContent>
            <Retry />
          </CardContent>
        </Card>
        <Card className={commonClasses.card}>
          <CardHeader className={commonClasses.cardHeader} title="Props change" />
          <CardContent>
            <PropsChangeApp />
          </CardContent>
        </Card>
        <Card className={commonClasses.card}>
          <CardHeader className={commonClasses.cardHeader} title="HOC" />
          <CardContent>
            <WrappedComponent value={10} />
          </CardContent>
        </Card>
        <Card className={[commonClasses.card, commonClasses.todoCard].join(' ')}>
          <CardHeader className={commonClasses.cardHeader} title="Todo" />
          <CardContent>
            <TodoContainer />
          </CardContent>
        </Card>
      </div>
      <section>
        <h1>Conflict</h1>
        <ConflictingActionsApp />
      </section>
    </div>
  );
};

export default App;
