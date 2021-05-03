import React, { Fragment, memo } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { createStore, useStore, useStoreSlice, StoreApi, useBindStore, slice } from '../../dist';
import { StoreActions } from '../../dist/types';
import { immerizeActions } from './immerizeActions';

type Shape = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

type State = {
  shapeIds: string[];
  shapeMap: { [id: string]: Shape };
  selectedId: string;
};

type Actions = {
  addShape: (x: number, y: number) => void;
  selectShape: (id: string) => void;
  moveShape: (id: string, x: number, y: number) => void;
  setShapeColor: (id: string, color: string) => void;
};
type Props = {
  generateId: () => string;
};

const getInitialState = (): State => ({
  shapeIds: [],
  shapeMap: {},
  selectedId: null,
});

const actions: StoreActions<State, Actions, Props> = {
  addShape: ({ s, args: [x, y], p }) => {
    const id = p.generateId();

    return {
      ...s,
      shapeIds: s.shapeIds.concat([id]),
      shapeMap: {
        ...s.shapeMap,
        [id]: { id, x, y, color: '#ffffff', width: 100, height: 100 },
      },
    };
  },
  selectShape: ({ s, args: [id] }) => ({
    ...s,
    selectedId: id,
  }),
  moveShape: ({ s, args: [id, x, y] }) => ({
    ...s,
    shapeMap: {
      ...s.shapeMap,
      [id]: {
        ...s.shapeMap[id],
        x,
        y,
      },
    },
  }),
  setShapeColor: ({ s, args: [id, color] }) => ({
    ...s,
    shapeMap: {
      ...s.shapeMap,
      [id]: {
        ...s.shapeMap[id],
        color,
      },
    },
  }),
};

// const actions: StoreActions<State, Actions, Props> = immerizeActions({
//   addShape: ({ s, args: [x, y], p }) => {
//     const id = p.generateId();
//     s.shapeIds.push(id);
//     s.shapeMap[id] = { id, x, y, color: '#fff', width: 100, height: 100 };
//   },
//   selectShape: ({ s, args: [id] }) => {
//     s.selectedId = id;
//   },
//   moveShape: ({ s, args: [id, x, y] }) => {
//     const shape = s.shapeMap[id];
//     shape.x = x;
//     shape.y = y;
//   },
//   setShapeColor: ({ s, args: [id, color] }) => {
//     s.shapeMap[id].color = color;
//   },
// });

let count = 0;
const generateId = () => `id_${count++}`;

const store = createStore(getInitialState, actions);

function ShapesApp() {
  console.log('render app');
  useBindStore(store, { generateId });

  return <ShapesAppView />;
}

// memo nothing to not refresh on state change
const ShapesAppView = memo(function ShapesAppView() {
  const { addShape } = useStoreSlice(store, slice('addShape'));

  return (
    <div>
      <div id="fpsCounter"></div>
      <button onClick={() => addShape(10, 10)}>add</button>
      <div style={{ display: 'flex', height: 500 }}>
        <Board />
        <ProperySheet />
      </div>
    </div>
  );
});

function Board() {
  const { addShape } = useStoreSlice(store, slice('addShape'));

  return (
    <div
      style={{ flex: 1, position: 'relative', height: '100%', border: '2px solid #000' }}
      onClick={(e) => addShape(e.clientX, e.clientY)}
    >
      <ShapeList />
    </div>
  );
}

function ShapeList() {
  const { shapeIds: ids } = useStoreSlice(store, slice('shapeIds'));

  return (
    <Fragment>
      {ids.map((id, idx) => (idx % 2 === 0 ? <Shape id={id} key={id} /> : <Shape2 id={id} key={id} />))}
    </Fragment>
  );
}

type ShapeProps = {
  id: string;
};

const preventDefault = (e: any) => {
  e.preventDefault();
  e.stopPropagation();
};

// memo the id
const Shape = memo(function Shape(p: ShapeProps) {
  const { shape, isSelected, move, select } = useStoreSlice(store, (s) => ({
    shape: s.shapeMap[p.id],
    isSelected: s.selectedId === p.id,
    move: s.moveShape,
    select: s.selectShape,
  }));

  const shapeCoordsRef = useRef(null);

  shapeCoordsRef.current = {
    x: shape.x,
    y: shape.y,
  };

  const onMouseDown = useCallback(
    (e) => {
      e.stopPropagation();

      if (!isSelected) {
        select(p.id);
      }
      const startCoords = {
        x: e.pageX,
        y: e.pageY,
      };
      const startShapeCoords = {
        ...shapeCoordsRef.current,
      };

      const onMouseMove = (e) => {
        const coords = startCoords;
        const shapeCoords = startShapeCoords;
        move(p.id, shapeCoords.x + e.pageX - coords.x, shapeCoords.y + e.pageY - coords.y);
      };

      const onMouseUp = (e) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [p.id]
  );

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={preventDefault}
      style={{
        position: 'absolute',
        left: shape.x + 5,
        top: shape.y + 5,
        width: shape.width,
        height: shape.height,
        borderRadius: 0,
        borderColor: isSelected ? 'red' : 'blue',
        borderStyle: 'solid',
        borderWidth: 2,
        backgroundColor: shape.color,
      }}
    ></div>
  );
});

function getShape(store: StoreApi<State, Actions, any>, id: string) {
  const s = store.state;
  const a = store.actions;
  return {
    shape: s.shapeMap[id],
    isSelected: s.selectedId === id,
    move: a.moveShape,
    select: a.selectShape,
  };
}

// Use store directly
const Shape2 = memo(function Shape2(p: ShapeProps) {
  const { shape, isSelected, move, select } = getShape(store, p.id);

  const nodeRef = useRef<HTMLDivElement>();

  useEffect(() => {
    const unregister = store.addStateListener(() => {
      const { shape, isSelected, move, select } = getShape(store, p.id);
      const node = nodeRef.current;
      node.style.left = `${shape.x}px`;
      node.style.top = `${shape.y}px`;
      node.style.borderColor = isSelected ? 'red' : 'blue';
      node.style.backgroundColor = shape.color;
    });
    return unregister;
  }, []);

  const shapeCoordsRef = useRef(null);

  shapeCoordsRef.current = {
    x: shape.x,
    y: shape.y,
  };

  const onMouseDown = useCallback(
    (e) => {
      e.stopPropagation();
      if (!isSelected) {
        select(p.id);
      }
      const startCoords = {
        x: e.pageX,
        y: e.pageY,
      };
      const startShapeCoords = {
        ...shapeCoordsRef.current,
      };

      let x: number;
      let y: number;

      const onMouseMove = (e) => {
        const coords = startCoords;
        const shapeCoords = startShapeCoords;
        x = shapeCoords.x + e.pageX - coords.x;
        y = shapeCoords.y + e.pageY - coords.y;
        move(p.id, x, y);
      };

      const onMouseUp = (e) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        shapeCoordsRef.current = {
          x,
          y,
        };
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [p.id]
  );

  return (
    <div
      ref={nodeRef}
      onMouseDown={onMouseDown}
      onClick={preventDefault}
      style={{
        position: 'absolute',
        left: shape.x,
        top: shape.y,
        width: shape.width,
        height: shape.height,
        borderRadius: 30,
        borderColor: isSelected ? 'red' : 'blue',
        borderStyle: 'solid',
        backgroundColor: shape.color,
        borderWidth: 2,
      }}
    ></div>
  );
});

function ProperySheet() {
  const { shape, move, setColor, selectedId } = useStoreSlice(store, (s) => ({
    selectedId: s.selectedId,
    shape: s.selectedId ? s.shapeMap[s.selectedId] : null,
    move: s.moveShape,
    setColor: s.setShapeColor,
  }));

  return (
    <div style={{ width: 300 }}>
      {shape && (
        <Fragment>
          <div>{selectedId}</div>

          <table>
            <tbody>
              <tr>
                <th>X</th>
                <td>
                  <input
                    type="number"
                    value={shape.x}
                    onChange={(e) => move(shape.id, parseInt(e.target.value), shape.y)}
                  />
                </td>
              </tr>
              <tr>
                <th>Y</th>
                <td>
                  <input
                    type="number"
                    value={shape.y}
                    onChange={(e) => move(shape.id, shape.x, parseInt(e.target.value))}
                  />
                </td>
              </tr>
              <tr>
                <th>Color</th>
                <td>
                  <input type="color" value={shape.color} onChange={(e) => setColor(shape.id, e.target.value)} />
                </td>
              </tr>
            </tbody>
          </table>
        </Fragment>
      )}
    </div>
  );
}

// const times = [];
// let fps: number;

// function refreshLoop() {
//   window.requestAnimationFrame(() => {
//     const now = performance.now();
//     while (times.length > 0 && times[0] <= now - 1000) {
//       times.shift();
//     }
//     times.push(now);
//     fps = times.length;
//     document.getElementById('fpsCounter').innerHTML = fps + '';
//     refreshLoop();
//   });
// }

// refreshLoop();

export default ShapesApp;
