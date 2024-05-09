import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StoreSchema, useStore } from '../DataStory/store/store';
import { shallow } from 'zustand/shallow';
import { DataStoryNodeData } from './ReactFlowNode';
import { Handle, Position } from 'reactflow';
import { ItemCollection } from './ItemCollection';
import { DataStoryEvents, DataStoryEventType } from '../DataStory/events/dataStoryEventType';
import { useDataStoryEvent } from '../DataStory/events/eventManager';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useFloating,
  useInteractions,
  useRole
} from '@floating-ui/react';
import { useIntersectionObserver } from './UseIntersectionObserver';
import { useMount, useUnmount } from 'ahooks';
import { ServerClientObservationConfig, DataStoryObservers } from '../DataStory/types';
import { createDataStoryId } from '@data-story/core';

const TRUNCATE_CELL_LENGTH = 50;

const formatCellContent = (content: unknown) => {
  let result = formatTooltipContent(content) as string;
  return result.length > TRUNCATE_CELL_LENGTH ? result.slice(0, TRUNCATE_CELL_LENGTH) + '...' : result;
}

const formatTooltipContent = (content: unknown) => {
  try {
    JSON.parse(content as string);
    return JSON.stringify(JSON.parse(content as string), null, 2);
  } catch(e) {
    return content;
  }
}

function TableNodeCell(props: {getTableRef: () => React.RefObject<HTMLTableElement>, content?: unknown}): JSX.Element {
  const { content = '', getTableRef } = props;
  const [showTooltip, setShowTooltip] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: showTooltip,
    onOpenChange: setShowTooltip,
    placement: 'bottom',
    // Make sure the tooltip stays on the screen
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(5),
      flip({
        fallbackAxisSideDirection: 'start'
      }),
      shift()
    ]
  });

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        showTooltip &&
        cellRef.current &&
        !cellRef.current?.contains(event.target as Node) &&
        !refs.floating.current?.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    }

    refs.floating.current?.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    }
  }, [showTooltip]);

  const click = useClick(context);
  const role = useRole(context, { role: 'tooltip' });

  // Merge all the interactions into prop getters
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    role
  ]);
  const Tooltip = () => {
    return (
      <pre
        data-cy={'data-story-table-tooltip'}
        ref={refs.setFloating}
        style={floatingStyles}
        {...getFloatingProps()}
        className="select-text overflow-visible z-50 bg-white shadow-lg p-2 rounded-md"
      >
        {formatTooltipContent(content) as string}
      </pre>
    );
  }

  return (
    <div
      ref={cellRef}>
      <span
        ref={refs.setReference} {...getReferenceProps()}
      >
        {formatCellContent(content)}
      </span>
      <FloatingPortal root={getTableRef()}>
        {
          showTooltip && Tooltip()
        }
      </FloatingPortal>
    </div>
  );
}

const TableNodeComponent = ({ id, data }: {
  id: string,
  data: DataStoryNodeData,
  selected: boolean
}) => {
  const [items, setItems] = useState([]) as any
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0)
  const tableRef = useRef<HTMLTableElement>(null);
  const [isDataFetched, setIsDataFetched] = useState(false);
  const [total, setTotal] = useState(0);
  const selector = (state: StoreSchema) => ({
    server: state.server,
    observerMap: state.observerMap,
    setObservers: state.setObservers,
  });

  const { server, observerMap, setObservers } = useStore(selector, shallow);

  const getTableRef = () => {
    return tableRef;
  }
  const input = data.inputs[0];

  const observerId = useRef(createDataStoryId());
  // Add the node to the inputObservers when the node is mounted
  useMount(() => {
    if (observerMap?.get(observerId.current)) {
      console.error('observers already exist');
      return;
    }

    const tableObserver : DataStoryObservers = {
      inputObservers: [{ nodeId: id, portId: 'input' }],
      onDataChange: (inputObserver, items) => {
        console.log('onDataChange', inputObserver, items);
        // todo: the observer maybe unmounted
        if(!observerMap?.get(observerId.current)) {
          console.error('observer unmounted');
          return;
        }
      }
    }

    setObservers(observerId.current, tableObserver);
  });

  useUnmount(() => {
    if (observerMap && !observerMap?.get(observerId.current)) {
      observerMap.delete(observerId.current);
    }
  })

  const loadTableData = useCallback(async() => {
    if (loading || (total === offset && offset !== 0)) return;
    setLoading(true);
    const limit = 100

    const itemsApi = server!.itemsApi
    if (!itemsApi) return;

    const { items: fetchedItems, total: fetchedTotal } = await itemsApi()?.getItems({
      atNodeId: id,
      limit,
      offset,
    })

    if (fetchedItems && fetchedItems.length > 0) {
      setItems(prevItems => [...prevItems, ...fetchedItems]);
      setOffset(prevOffset => prevOffset + fetchedItems.length)
    }

    setLoading(false);
    setTotal(fetchedTotal);
  }, [id, loading, offset, server, total]);

  const dataStoryEvent = useCallback((event: DataStoryEventType) => {
    if (event.type === DataStoryEvents.RUN_START) {
      setItems([])
      setOffset(0);
      setIsDataFetched(false);
    }

    if (event.type === DataStoryEvents.RUN_SUCCESS) {
      loadTableData();
      setIsDataFetched(true);
    }
  }, []);

  useDataStoryEvent(dataStoryEvent);
  const loaderRef = useIntersectionObserver(loadTableData);
  let { headers, rows } = new ItemCollection(items).toTable()

  if (items.length === 0) {
    headers = []
    rows = []
  }

  return (
    (
      <div
        className="shadow-xl bg-gray-50 border rounded border-gray-300"
      >
        <div className="absolute z-30">
          <div className="absolute">

          </div>
          <div className="">
            <Handle
              className="relative"
              type="target"
              position={Position.Left}
              style={{
                opacity: 0,
                backgroundColor: 'red',
                position: 'relative',
                height: 1,
                width: 1,
                top: 0,
                right: 0
              }}
              id={input.id}
              isConnectable={true}
            />
          </div>
        </div>
        <div className="text-gray-600 bg-gray-100 rounded font-mono text-xxxs max-h-24">
          <div
            data-cy={'data-story-table'}
            className="max-h-24 nowheel overflow-auto scrollbar rounded-sm">
            <table ref={tableRef} className="table-auto rounded-sm">
              <thead>
                <tr className="bg-gray-200 space-x-8">
                  {
                    !isDataFetched &&
                  <th
                    className="whitespace-nowrap bg-gray-200 text-left px-1 border-r-0.5 last:border-r-0 border-gray-300 sticky top-0 z-10">
                    Awaiting data
                  </th>
                  }
                  {
                    headers.map(header => (<th
                      data-cy={'data-story-table-th'}
                      className="whitespace-nowrap bg-gray-200 text-left px-1 border-r-0.5 last:border-r-0 border-gray-300 sticky top-0 z-10"
                      key={header}
                    >
                      <TableNodeCell getTableRef={getTableRef} content={header}/>
                    </th>))
                  }
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowindex) => (<tr
                  data-cy={'data-story-table-row'}
                  className="odd:bg-gray-50"
                  key={rowindex}
                >
                  {row.map((cell, cellIndex) => (<td
                    className="whitespace-nowrap px-1"
                    key={cellIndex}
                  >
                    <TableNodeCell getTableRef={getTableRef} content={cell}/>

                  </td>))}
                </tr>))}
                {!isDataFetched && <tr className="bg-gray-100 hover:bg-gray-200">
                  <td
                    colSpan={6}
                    className="text-center"
                  >
                  Load initial data...
                  </td>
                </tr>}
              </tbody>
            </table>
            {
              (<div
                ref={loaderRef}
                style={{ display: isDataFetched ? 'block' : 'none' }}
                className="loading-spinner h-0.5"
              >
              </div>)
            }
            {
              (isDataFetched && headers.length === 0 && rows.length === 0)
              && (<div className="text-center text-gray-500 p-2">
                No data
              </div>)
            }
          </div>
        </div>
      </div>
    )
  );
};

export default memo(TableNodeComponent)
