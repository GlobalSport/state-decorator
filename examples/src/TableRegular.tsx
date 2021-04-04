import React, { memo } from 'react';

import MTable from '@material-ui/core/Table';
import MTableBody from '@material-ui/core/TableBody';
import MTableCell from '@material-ui/core/TableCell';
import MTableHead from '@material-ui/core/TableHead';
import MTableRow from '@material-ui/core/TableRow';
import DeleteIcon from '@material-ui/icons/Delete';
import ArrowUpIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownIcon from '@material-ui/icons/ArrowDownward';
import { useStore } from '../../src';
import FlashingBox, { useFlashingNode } from './FlashingBox';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import { useRef } from 'react';
import { Actions, State, store } from './TableStore';

type TableRowProps = TableBodyProps & {
  id: string;
};

const TableRow = memo(function TableRow(p: TableRowProps) {
  const row = p.rowMap[p.id];

  const ref = useRef();

  useFlashingNode(ref, 'blue');

  return (
    <MTableRow ref={ref}>
      <MTableCell>{row.id}</MTableCell>
      {['col1', 'col2'].map((col) => (
        <MTableCell key={col}>
          <TextField label={col} value={row[col]} onChange={(e) => p.editValue(row.id, col, e.target.value)} />
        </MTableCell>
      ))}
      <MTableCell>
        <IconButton size="small" onClick={() => p.moveRow(row.id, false)}>
          <ArrowDownIcon />
        </IconButton>
        <IconButton size="small" onClick={() => p.moveRow(row.id, true)}>
          <ArrowUpIcon />
        </IconButton>
        <IconButton size="small" onClick={() => p.deleteRow(row.id)}>
          <DeleteIcon />
        </IconButton>
      </MTableCell>
    </MTableRow>
  );
});

type TableBodyProps = Pick<State, 'rows' | 'rowMap'> & Actions;

const TableBody = memo(function TableBody(p: TableBodyProps) {
  const { rows } = p;
  const ref = useRef();

  useFlashingNode(ref, 'green');

  return (
    <MTableBody ref={ref}>
      {rows.map((rowId) => (
        <TableRow key={rowId} id={rowId} {...p} />
      ))}
    </MTableBody>
  );
});

type ToolbarProps = Pick<Actions, 'insertRow'>;

function Toolbar(p: ToolbarProps) {
  return (
    <Box>
      <Button onClick={() => p.insertRow()}>Add</Button>
    </Box>
  );
}

function TableApp() {
  const { state, actions } = useStore(store);

  return (
    <FlashingBox>
      <Toolbar insertRow={actions.insertRow} />
      <MTable>
        <MTableHead>
          <MTableRow>
            <MTableCell>Id</MTableCell>
            <MTableCell>Col1</MTableCell>
            <MTableCell>Col2</MTableCell>
            <MTableCell></MTableCell>
          </MTableRow>
        </MTableHead>
        <TableBody {...state} {...actions} />
      </MTable>
    </FlashingBox>
  );
}

export default TableApp;
