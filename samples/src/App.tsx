// import ConflictPolicies from './ConflictPolicies';
// import Slice from './GlobalStateSlice';
// import LocalSlice from './LocalStateSlice';
// import TableApp from './TableApp';
import TodoApp from './TodoApp';
// import Debounce from './Debounce';
// import Recipes from './Recipes';
// import Optimistic from './Optimistic';
// import Abort from './Abort';
// import ParallelAbort from './ParallelAbort';
// import StateSharing from './sample';
// import Tabs from '@mui/material/Tabs';
// import Tab from '@mui/material/Tab';
// import Box from '@mui/material/Box';
// import Paper from '@mui/material/Paper';
import { useState, ReactNode } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import classes from './App.css';

// import PropsChangeOnMount from './PropsChangeOnMount';
// import DeferOnMount from './DeferOnMount';

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
        >
          <Tab label="Todo" />
          {/* <Tab label="Table" />
          <Tab label="Slices" />
          <Tab label="Conflict Policy" />
          <Tab label="Optimistic" />
          <Tab label="Abort" />
          <Tab label="Debounce" />
          <Tab label="State sharing" />
          <Tab label="Props change onmount" />
          <Tab label="Error" />
          <Tab label="Recipes" />
          <Tab label="Defer onMount" /> */}
        </Tabs>
        <Box flex={1} className={classes.content}>
          <TabPanel tabId={tabId} index={0} classes={classes}>
            <TodoApp />
          </TabPanel>
          {/* <TabPanel tabId={tabId} index={1} classes={classes}>
            <TableApp />
          </TabPanel>
          <TabPanel tabId={tabId} index={2} classes={classes}>
            <Box>
              <Box mb={2}>
                <Typography variant="body1">Global State</Typography>
                <Slice />
              </Box>
              <Box mb={2}>
                <Typography variant="body1">Local State</Typography>
                <LocalSlice />
              </Box>
            </Box>
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
          <TabPanel tabId={tabId} index={7} classes={classes}>
            <StateSharing />
          </TabPanel>
          <TabPanel tabId={tabId} index={8} classes={classes}>
            <PropsChangeOnMount />
          </TabPanel>
          <TabPanel tabId={tabId} index={9} classes={classes}>
            <ErrorMap />
          </TabPanel>
          <TabPanel tabId={tabId} index={10} classes={classes}>
            <Recipes />
          </TabPanel>
          <TabPanel tabId={tabId} index={11} classes={classes}>
            <DeferOnMount />
          </TabPanel> */}
        </Box>
      </Paper>
    </Box>
  );
}

// const useStyles = makeStyles((theme) => ({
//   root: {
//     marginTop: theme.spacing(4),
//   },
//   paper: {
//     margin: `${theme.spacing(4)}px`,

//     padding: `${theme.spacing(4)}px`,
//     paddingLeft: 0,

//     display: 'flex',
//   },
//   tabs: {
//     width: 200,
//     marginRight: `${theme.spacing(2)}px`,
//     borderRight: `1px solid #cccccc`,
//   },

//   content: {
//     flex: 1,
//     padding: theme.spacing(2),
//   },
// }));
