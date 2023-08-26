import TableApp from './TableApp';
import TodoApp from './TodoApp';
import Debounce from './Debounce';
import ErrorMap from './ErrorMap';
import Recipes from './Recipes';
import Optimistic from './Optimistic';
import ParallelAbort from './ParallelAbort';
import StateSharing from './StateSharing';
import { useState, ReactNode } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import classes from './App.module.css';
import SliceApp from './SliceApp';
import ConflictPoliciesApp from './ConflictPolicies';
import Abort from './Abort';

import PropsChangeOnMount from './PropsChangeOnMount';
import DeferOnMount from './DeferOnMount';

type TabPanelProps = {
  children?: ReactNode;
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
          sx={{ borderRight: 1, borderColor: 'divider' }}
        >
          <Tab label="Todo" />
          <Tab label="Table" />
          <Tab label="Slices" />
          <Tab label="Conflict Policy" />
          <Tab label="Optimistic" />
          <Tab label="Abort" />
          <Tab label="Debounce" />
          <Tab label="State sharing" />
          <Tab label="Props change onmount" />
          <Tab label="Error" />
          <Tab label="Recipes" />
          <Tab label="Defer onMount" />
        </Tabs>
        <Box flex={1} className={classes.content}>
          <TabPanel tabId={tabId} index={0}>
            <TodoApp />
          </TabPanel>
          <TabPanel tabId={tabId} index={1}>
            <TableApp />
          </TabPanel>
          <TabPanel tabId={tabId} index={2}>
            <SliceApp />
          </TabPanel>
          <TabPanel tabId={tabId} index={3}>
            <ConflictPoliciesApp />
          </TabPanel>
          <TabPanel tabId={tabId} index={4}>
            <Optimistic />
          </TabPanel>
          <TabPanel tabId={tabId} index={5}>
            <Abort />
            <ParallelAbort />
          </TabPanel>
          <TabPanel tabId={tabId} index={6}>
            <Debounce />
          </TabPanel>
          <TabPanel tabId={tabId} index={7}>
            <StateSharing />
          </TabPanel>
          <TabPanel tabId={tabId} index={8}>
            <PropsChangeOnMount />
          </TabPanel>
          <TabPanel tabId={tabId} index={9}>
            <ErrorMap />
          </TabPanel>
          <TabPanel tabId={tabId} index={10}>
            <Recipes />
          </TabPanel>
          <TabPanel tabId={tabId} index={11}>
            <DeferOnMount />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
