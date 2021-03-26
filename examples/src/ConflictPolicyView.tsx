import React from "react";

import RequestStatus from "./RequestStatus";

import Box from "@material-ui/core/Box";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

import { ConflictPolicyViewProps } from "./ConflictPolicy";

// Stateless component
// Separate container from view to test more easily the view.

function ConflictPolicyView(p: ConflictPolicyViewProps) {
  const {
    title,
    description,
    usage,
    calls,
    executions,
    text,
    status,
    onTextChange
  } = p;

  const styles = useStyles({});
  return (
    <Box mb={2} p={2} className={styles.box}>
      <Typography variant="h6">Conflict Policy: {title}</Typography>
      <Typography>{description}</Typography>
      <Typography>
        <b>Usage</b>: {usage}
      </Typography>
      <Box mt={1}>
        <Typography variant="caption">
          Each character typed triggers a 2s action.
        </Typography>
      </Box>
      <Box mt={2} mb={2}>
        <TextField
          onChange={e => onTextChange(e.target.value)}
          placeholder="Type text here"
        />
      </Box>
      <RequestStatus status={status} duration={2} />
      <Box mt={1}>
        <Typography>Action calls: {calls}</Typography>
      </Box>
      <Box mt={1}>
        <Typography>Executions: {executions}</Typography>
      </Box>

      <Box mt={1}>
        <Typography>Saved state: {text}</Typography>
      </Box>
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  btn: {
    marginRight: theme.spacing(2)
  },

  box: {
    border: "1px solid #ccc",
    borderRadius: 5
  }
}));

export default ConflictPolicyView;
