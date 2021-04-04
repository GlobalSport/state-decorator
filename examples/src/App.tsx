import React from 'react';
import ConflictPolicies from './ConflictPolicies';
import Slice from './Slice';
import TableApp from './TableApp';
import TodoApp from './TodoApp';
import Debounce from './Debounce';
import Optimistic from './Optimistic';
import Abort from './Abort';
import ParallelAbort from './ParallelAbort';

import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import { useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';

type TabPanelProps = {
  children?: React.ReactNode;
  classes: ReturnType<typeof useStyles>;
  index: any;
  tabId: any;
};

function TabPanel(props: TabPanelProps) {
  const { children, tabId, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={tabId !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {tabId === index && children}
    </div>
  );
}

export default function App() {
  const [tabId, setTabId] = useState(() => {
    const hash = window.location.hash.substr(1);
    if (hash === '') {
      return 0;
    }
    return parseInt(hash);
  });

  const onTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTabId(newValue);
    window.location.hash = `${newValue}`;
  };

  const classes = useStyles();

  return (
    <Box className={classes.root}>
      <Paper className={classes.paper}>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={tabId}
          className={classes.tabs}
          onChange={onTabChange}
          aria-label="Vertical tabs example"
        >
          <Tab label="Todo" />
          <Tab label="Table" />
          <Tab label="Slices" />
          <Tab label="Conflict Policy" />
          <Tab label="Optimistic" />
          <Tab label="Abort" />
          <Tab label="Debounce" />
        </Tabs>
        <Box flex={1} className={classes.content}>
          <TabPanel tabId={tabId} index={0} classes={classes}>
            <TodoApp />
          </TabPanel>
          <TabPanel tabId={tabId} index={1} classes={classes}>
            <TableApp />
          </TabPanel>
          <TabPanel tabId={tabId} index={2} classes={classes}>
            <Slice />
          </TabPanel>
          <TabPanel tabId={tabId} index={3} classes={classes}>
            <ConflictPolicies />
          </TabPanel>
          <TabPanel tabId={tabId} index={4} classes={classes}>
            <Optimistic />
          </TabPanel>
          <TabPanel tabId={tabId} index={5} classes={classes}>
            <Abort />
            <ParallelAbort />
          </TabPanel>
          <TabPanel tabId={tabId} index={6} classes={classes}>
            <Debounce />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
  },
  paper: {
    margin: `${theme.spacing(4)}px`,

    padding: `${theme.spacing(4)}px`,
    paddingLeft: 0,

    display: 'flex',
  },
  tabs: {
    width: 200,
    marginRight: `${theme.spacing(2)}px`,
    borderRight: `1px solid #cccccc`,
  },

  content: {},
}));
