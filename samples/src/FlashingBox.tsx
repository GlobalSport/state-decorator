import React, { useEffect, useRef } from 'react';
import { MutableRefObject } from 'react';

type FlashingBoxProps = {
  title?: string;
  children: any;
  color?: string;
};

const styles: React.CSSProperties = {
  border: `1px solid`,
  padding: 20,
  margin: 20,
  outline: '2px solid transparent',
  transition: `all ease .2s`,
  position: 'relative',
};
const titleStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: -16,
  fontSize: 12,
};

export default function FlashingBox(p: FlashingBoxProps) {
  const { title } = p;
  const countRef = useRef(0);
  countRef.current++;
  const node = useRef<HTMLDivElement>();

  useFlashingNode(node, p.color);

  return (
    <div ref={node} style={styles}>
      {title && <div style={titleStyle}>{title}</div>}
      {p.children}
    </div>
  );
}

export function useFlashingNode(node: MutableRefObject<any>, color: string = 'red') {
  const countRef = useRef(0);
  countRef.current++;

  useEffect(() => {
    node.current.style.outline = `2px solid ${color}`;
    let id = setTimeout(() => {
      node.current.style.outline = styles.outline?.toString();
    }, 500);
    return () => {
      clearTimeout(id);
    };
  }, [countRef.current]);
}
