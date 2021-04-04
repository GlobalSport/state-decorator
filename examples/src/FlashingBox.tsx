import React, { useEffect, useRef } from 'react';
import { MutableRefObject } from 'react';

type FlashingBoxProps = {
  children: any;
};

const styles: React.CSSProperties = {
  border: `1px solid`,
  padding: 20,
  margin: 20,
  outline: '2px solid transparent',
  transition: `all ease .2s`,
};

export default function FlashingBox(p: FlashingBoxProps) {
  const countRef = useRef(0);
  countRef.current++;
  const node = useRef<HTMLDivElement>();

  useEffect(() => {
    node.current.style.outline = '2px solid red';
    setTimeout(() => {
      node.current.style.outline = styles.outline.toString();
    }, 500);
  }, [countRef.current]);

  return (
    <div ref={node} style={styles}>
      {p.children}
    </div>
  );
}

export function useFlashingNode(node: MutableRefObject<any>, color = 'red') {
  const countRef = useRef(0);
  countRef.current++;

  useEffect(() => {
    node.current.style.outline = `2px solid ${color}`;
    setTimeout(() => {
      node.current.style.outline = styles.outline.toString();
    }, 500);
  }, [countRef.current]);
}
