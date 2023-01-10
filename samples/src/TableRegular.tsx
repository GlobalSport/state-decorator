import React, { memo } from 'react';

import MTable from '@mui/material/Table';
import MTableBody from '@mui/material/TableBody';
import MTableCell from '@mui/material/TableCell';
import MTableHead from '@mui/material/TableHead';
import MTableRow from '@mui/material/TableRow';
import DeleteIcon from '@material-ui/icons/Delete';
import ArrowUpIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownIcon from '@material-ui/icons/ArrowDownward';
import { useStoreSlice } from './sd';
import FlashingBox, { useFlashingNode } from './FlashingBox';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
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
  // not using useStore because store is shared
  const s = useStoreSlice(store, (i) => i);

  return (
    <FlashingBox>
      <Toolbar insertRow={s.insertRow} />
      <MTable>
        <MTableHead>
          <MTableRow>
            <MTableCell>Id</MTableCell>
            <MTableCell>Col1</MTableCell>
            <MTableCell>Col2</MTableCell>
            <MTableCell></MTableCell>
          </MTableRow>
        </MTableHead>
        <TableBody {...s} />
      </MTable>
    </FlashingBox>
  );
}

export default TableApp;
