import { memo } from 'react';

import {
  Table as MTable,
  TableBody as MTableBody,
  TableCell as MTableCell,
  TableHead as MTableHead,
  TableRow as MTableRow,
  Box,
  Button,
  TextField,
  IconButton,
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownIcon from '@mui/icons-material/ArrowDownward';
import { pick, slice, useStoreSlice } from './sd';
import FlashingBox, { useFlashingNode } from './FlashingBox';
import { useRef } from 'react';
import { store } from './TableStore';

type TableRowProps = {
  id: string;
};

const COLS = ['col1', 'col2'] as const;

// memo for id
const TableRow = memo(function TableRow(p: TableRowProps) {
  const s = useStoreSlice(store, (s) => ({
    ...pick(s, ['editValue', 'moveRow', 'deleteRow']),
    row: s.rowMap[p.id],
  }));

  const { row } = s;

  const ref = useRef();

  useFlashingNode(ref, 'blue');

  return (
    <MTableRow ref={ref}>
      <MTableCell>{row.id}</MTableCell>
      {COLS.map((col) => (
        <MTableCell key={col}>
          <TextField
            size="small"
            label={col}
            value={row[col]}
            onChange={(e) => s.editValue(row.id, col, e.target.value)}
          />
        </MTableCell>
      ))}
      <MTableCell>
        <IconButton size="small" onClick={() => s.moveRow(row.id, false)}>
          <ArrowDownIcon />
        </IconButton>
        <IconButton size="small" onClick={() => s.moveRow(row.id, true)}>
          <ArrowUpIcon />
        </IconButton>
        <IconButton size="small" onClick={() => s.deleteRow(row.id)}>
          <DeleteIcon />
        </IconButton>
      </MTableCell>
    </MTableRow>
  );
});

function TableBody() {
  // rows is updated only on add / delete / reorder
  const { rows } = useStoreSlice(store, slice('rows'));

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
  const s = useStoreSlice(store, slice('insertRow'));

  return (
    <Box>
      <Button onClick={() => s.insertRow()}>Add</Button>
    </Box>
  );
}

function TableApp() {
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
