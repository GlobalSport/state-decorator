import React, { memo } from 'react';

import MTable from '@material-ui/core/Table';
import MTableBody from '@material-ui/core/TableBody';
import MTableCell from '@material-ui/core/TableCell';
import MTableHead from '@material-ui/core/TableHead';
import MTableRow from '@material-ui/core/TableRow';
import DeleteIcon from '@material-ui/icons/Delete';
import ArrowUpIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownIcon from '@material-ui/icons/ArrowDownward';
import { useBindStore, useStoreSlice } from '../../src';
import FlashingBox, { useFlashingNode } from './FlashingBox';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import { useRef } from 'react';
import { store } from './TableStore';

type TableRowProps = {
  id: string;
};

// memo for id
const TableRow = memo(function TableRow(p: TableRowProps) {
  const { row, actions } = useStoreSlice(store, ({ s, actions }) => ({
    actions,
    row: s.rowMap[p.id],
  }));

  const ref = useRef();

  useFlashingNode(ref, 'blue');

  return (
    <MTableRow ref={ref}>
      <MTableCell>{row.id}</MTableCell>
      {['col1', 'col2'].map((col) => (
        <MTableCell key={col}>
          <TextField label={col} value={row[col]} onChange={(e) => actions.editValue(row.id, col, e.target.value)} />
        </MTableCell>
      ))}
      <MTableCell>
        <IconButton size="small" onClick={() => actions.moveRow(row.id, false)}>
          <ArrowDownIcon />
        </IconButton>
        <IconButton size="small" onClick={() => actions.moveRow(row.id, true)}>
          <ArrowUpIcon />
        </IconButton>
        <IconButton size="small" onClick={() => actions.deleteRow(row.id)}>
          <DeleteIcon />
        </IconButton>
      </MTableCell>
    </MTableRow>
  );
});

function TableBody() {
  // rows is updated only on add / delete / reorder
  const { rows } = useStoreSlice(store, ({ s }) => ({ rows: s.rows }));

  const ref = useRef();

  useFlashingNode(ref, 'green');

  return (
    <MTableBody ref={ref}>
      {rows.map((rowId) => (
        <TableRow key={rowId} id={rowId} />
      ))}
    </MTableBody>
  );
}

function Toolbar() {
  const { actions } = useStoreSlice(store, ({ actions }) => ({ actions }));

  return (
    <Box>
      <Button onClick={() => actions.insertRow()}>Add</Button>
    </Box>
  );
}

function TableApp() {
  useBindStore(store);

  return (
    <FlashingBox>
      <Toolbar />
      <MTable>
        <MTableHead>
          <MTableRow>
            <MTableCell>Id</MTableCell>
            <MTableCell>Col1</MTableCell>
            <MTableCell>Col2</MTableCell>
            <MTableCell></MTableCell>
          </MTableRow>
        </MTableHead>
        <TableBody />
      </MTable>
    </FlashingBox>
  );
}

export default TableApp;
