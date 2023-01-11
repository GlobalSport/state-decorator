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
import { useStoreSlice } from './sd';
import FlashingBox, { useFlashingNode } from './FlashingBox';
import { memo, useRef } from 'react';
import { Actions, State, store } from './TableStore';

type TableRowProps = TableBodyProps & {
  id: string;
};

const COLS = ['col1', 'col2'] as const;

const TableRow = memo(function TableRow(p: TableRowProps) {
  const row = p.rowMap[p.id];

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
            onChange={(e) => p.editValue(row.id, col, e.target.value)}
          />
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
