import React, { memo } from 'react';

import MTable from '@material-ui/core/Table';
import MTableBody from '@material-ui/core/TableBody';
import MTableCell from '@material-ui/core/TableCell';
import MTableHead from '@material-ui/core/TableHead';
import MTableRow from '@material-ui/core/TableRow';
import DeleteIcon from '@material-ui/icons/Delete';
import ArrowUpIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownIcon from '@material-ui/icons/ArrowDownward';
import { createStore, StoreActions, useBindStore, useStoreSlice } from '../../src';
import produce from 'immer';
import FlashingBox, { useFlashingNode } from './FlashingBox';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import { useRef } from 'react';

export type Row = {
  id: string;
  col1: string;
  col2: string;
};

export type State = {
  rows: string[];
  rowMap: Record<string, Row>;
};

export type Actions = {
  editValue: (id: string, field: string, value: string) => void;
  insertRow: () => void;
  deleteRow: (id: string) => void;
  moveRow: (id: string, up: boolean) => void;
};

function getInitialState(): State {
  const row: Row = {
    id: '1',
    col1: '1-1',
    col2: '1-2',
  };

  return {
    rows: ['1'],
    rowMap: {
      '1': row,
    },
  };
}

const actionsImpl: StoreActions<State, Actions> = {
  editValue: ({ s, args: [id, field, value] }) =>
    produce(s, (s) => {
      if (s.rowMap[id]) {
        s.rowMap[id][field] = value;
      }
    }),
  insertRow: ({ s }) =>
    produce(s, (s) => {
      const row = {
        id: `${Math.round(Math.random() * 1000)}`,
        col1: '',
        col2: '',
      };
      s.rowMap[row.id] = row;
      s.rows.push(row.id);
    }),
  deleteRow: ({ s, args: [id] }) =>
    produce(s, (s) => {
      if (s.rowMap[id]) {
        const idx = s.rows.findIndex((r) => r === id);
        s.rows.splice(idx, 1);
        delete s.rowMap[id];
      }
    }),
  moveRow: ({ s, args: [id, up] }) =>
    produce(s, (s) => {
      const idx = s.rows.findIndex((rId) => rId === id);
      if ((up && idx === 0) || (!up && idx === s.rows.length - 1)) {
        return;
      }
      const newIdx = idx + (up ? -1 : 1);
      const cell = s.rows[newIdx];
      s.rows[newIdx] = s.rows[idx];
      s.rows[idx] = cell;
    }),
};

export const store = createStore(getInitialState, actionsImpl);
store.init({});