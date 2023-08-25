import React from 'react';

import { ConflictPolicy as Policy } from './sd_src';
import ConflictPolicy from './ConflictPolicy';
import Parallel from './Parallel';

function ConflictPolicies() {
  return (
    <React.Fragment>
      <ConflictPolicy
        title="Keep All"
        conflictPolicy={Policy.KEEP_ALL}
        description="Execute each action call one after the other."
        usage="(Default) Get requests"
      />
      <ConflictPolicy
        title="Keep Last"
        conflictPolicy={Policy.KEEP_LAST}
        description="If an action is ongoing, keep the last conflicting call one and execute when ongoing action is done."
        usage="Save only the more recent state of an editor (no useless request)."
      />
      <ConflictPolicy
        title="Ignore"
        conflictPolicy={Policy.IGNORE}
        description="If an action is ongoing, ignore all next calls of this action until ongoing action is done."
        usage="Action that creates an object (prevent duplication)"
      />
      <ConflictPolicy
        title="Reject"
        conflictPolicy={Policy.REJECT}
        description="Return a rejected promise on a conflicting action call."
        usage="Debug the UI"
      />
      <Parallel />
    </React.Fragment>
  );
}

export default ConflictPolicies;
