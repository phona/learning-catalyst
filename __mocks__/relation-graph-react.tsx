import React, { forwardRef, useImperativeHandle, useState } from 'react';

export type RGOptions = any;
export type RGJsonData = { nodes?: any[]; links?: any[] };
export type RGNode = any;
export type RGLink = any;
export type RelationGraphComponent = any;

const RelationGraphMock = forwardRef<any, any>((props, ref) => {
  const [data, setData] = useState<RGJsonData>({ nodes: [], links: [] });

  const instance = {
    setJsonData: async (json: RGJsonData) => {
      setData(json);
    },
    getNodes: () => data.nodes ?? [],
    getLinks: () => data.links ?? [],
    dataUpdated: () => {},
  };

  useImperativeHandle(ref, () => ({
    getInstance: () => instance,
  }));

  return (
    <div data-testid="rg-mock">
      {/* Render children if provided (component renders nodes as children) */}
      {props.children
        ? props.children
        : (data.nodes ?? []).map((node: any) =>
            props.nodeSlot ? (
              <div key={node.id} onContextMenu={(e) => e.preventDefault()}>
                {props.nodeSlot({ node })}
              </div>
            ) : (
              <div key={node.id}>{node.text}</div>
            ),
          )}
    </div>
  );
});

export default RelationGraphMock;
