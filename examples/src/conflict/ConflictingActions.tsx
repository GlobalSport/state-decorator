import React from 'react';
import StateDecorator, { StateDecoratorActions, ConflictPolicy } from '../../../src/StateDecorator';
import ParallelActions from './ParallelActions';
import ReuseConflictPolicy from './ReuseConflictPolicy';
import useCommonStyles from '../style.js';
import { Card, CardHeader, CardContent, makeStyles } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';

const useLocalStyle = makeStyles({
  container: {
    width: '75%',
    margin: '0 auto',
  },
});
export type State = {
  counter: number;
  text: string;
};

export type Actions = {
  updateText: (text: string) => Promise<string>;
};

export const getInitialState = (): State => ({
  counter: 0,
  text: '',
});

export interface Props {
  title: string;
  description: string;
  conflictPolicy: ConflictPolicy;
}

const ConflictingActionsContainerView = React.memo(function ConflictingActionsContainerView(
  props: Pick<Props, 'title' | 'description'> & State & Actions
) {
  const { title, description, counter, text, updateText } = props;
  const commonClasses = useCommonStyles();
  const localClasses = useLocalStyle();

  return (
    <Card className={commonClasses.card}>
      <CardHeader className={commonClasses.cardHeader} title={title} subheader={description} />
      <CardContent>
        <div className={localClasses.container}>
          <TextField onChange={(e) => updateText(e.target.value)} placeholder="Write here" fullWidth />
          <div className={commonClasses.smallCardValue}>Server calls #: {counter}</div>
          <div className={commonClasses.smallCardValue}>Server state: {text}</div>
        </div>
      </CardContent>
    </Card>
  );
});

class ConflictingActionsContainer extends React.PureComponent<Props> {
  actions: StateDecoratorActions<State, Actions> = {
    updateText: {
      promise: ([text]) => new Promise((res) => setTimeout(res, 1000, text)),
      reducer: (s, text) => ({ ...s, text, counter: s.counter + 1 }),
      conflictPolicy: this.props.conflictPolicy,
    },
  };

  render() {
    const { title, description } = this.props;
    return (
      <StateDecorator<State, Actions> actions={this.actions} initialState={getInitialState()}>
        {({ counter, text }, actions) => (
          <ConflictingActionsContainerView
            updateText={actions.updateText}
            counter={counter}
            text={text}
            title={title}
            description={description}
          />
        )}
      </StateDecorator>
    );
  }
}

const ConflictApp = () => {
  const commonClasses = useCommonStyles();
  return (
    <div className={commonClasses.container}>
      <Card className={commonClasses.card}>
        <CardHeader
          className={commonClasses.cardHeader}
          title="Reuse"
          subheader={`Returns the current promise, if any, or create a new promise.
The buttons triggers an action that takes 3 seconds to return.`}
        />
        <CardContent>
          <ReuseConflictPolicy />
        </CardContent>
      </Card>
      <ConflictingActionsContainer
        title="Keep All"
        conflictPolicy={ConflictPolicy.KEEP_ALL}
        description="Chain all action calls"
      />
      <ConflictingActionsContainer
        title="Keep Last"
        conflictPolicy={ConflictPolicy.KEEP_LAST}
        description="Keep only last (more recent) call to be executed when the previous call is resolved"
      />
      <ConflictingActionsContainer
        title="Ignore"
        conflictPolicy={ConflictPolicy.IGNORE}
        description="Ignore conflicting action calls"
      />
      <ConflictingActionsContainer
        title="Reject"
        conflictPolicy={ConflictPolicy.REJECT}
        description="Return a rejected promise on a conflicting action call."
      />
      <Card className={commonClasses.card}>
        <CardHeader
          className={commonClasses.cardHeader}
          title="Parallel actions"
          subheader="Actions are launched on blur, in parallel for 3s"
        />
        <CardContent>
          <ParallelActions />
        </CardContent>
      </Card>
    </div>
  );
};

export default ConflictApp;
