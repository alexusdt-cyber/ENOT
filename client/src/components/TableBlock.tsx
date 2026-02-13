import { useState, useRef, useEffect } from "react";
import {
  Table as TableIcon,
  Plus,
  Trash2,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
} from "lucide-react";

interface TableBlockProps {
  blockId: string;
  tableData?: {
    rows: number;
    cols: number;
    cells: { [key: string]: string };
    alignment?: { [key: string]: "left" | "center" | "right" };
    columnWidths?: { [key: number]: number };
    tableWidth?: number;
  };
  onUpdate: (blockId: string, content: string, metadata?: any) => void;
  onDelete: (blockId: string) => void;
}

export function TableBlock({
  blockId,
  tableData,
  onUpdate,
  onDelete,
}: TableBlockProps) {
  const [rows, setRows] = useState(tableData?.rows || 3);
  const [cols, setCols] = useState(tableData?.cols || 3);
  const [cells, setCells] = useState<{ [key: string]: string }>(
    tableData?.cells || {}
  );
  const [alignment, setAlignment] = useState<{
    [key: string]: "left" | "center" | "right";
  }>(tableData?.alignment || {});
  const [columnWidths, setColumnWidths] = useState<{ [key: number]: number }>(
    tableData?.columnWidths || {}
  );
  const [tableWidth, setTableWidth] = useState<number>(tableData?.tableWidth || 100);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const [showColMenu, setShowColMenu] = useState<number | null>(null);
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const [resizingTable, setResizingTable] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const cellRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tableRef = useRef<HTMLTableElement | null>(null);
  const isDeletedRef = useRef(false);

  // Update parent when cells change
  useEffect(() => {
    if (!isDeletedRef.current) {
      onUpdate(blockId, "", {
        tableData: { rows, cols, cells, alignment, columnWidths, tableWidth },
      });
    }
  }, [cells, rows, cols, alignment, columnWidths, tableWidth]);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDeletedRef.current = true;
    onDelete(blockId);
  };

  // Handle column resize
  const handleColResizeStart = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(colIndex);
    setStartX(e.clientX);
    setStartWidth(columnWidths[colIndex] || 150);
  };

  // Handle table resize
  const handleTableResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingTable(true);
    setStartX(e.clientX);
    setStartWidth(tableWidth);
  };

  const MIN_COL_WIDTH = 80;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingCol !== null) {
        const diff = e.clientX - startX;
        const newWidth = Math.max(MIN_COL_WIDTH, startWidth + diff);
        setColumnWidths((prev) => ({ ...prev, [resizingCol]: newWidth }));
      }
      if (resizingTable) {
        const diff = e.clientX - startX;
        const containerWidth = tableRef.current?.parentElement?.offsetWidth || 800;
        const widthDiff = (diff / containerWidth) * 100;
        const newWidth = Math.max(30, Math.min(100, startWidth + widthDiff));
        setTableWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      setResizingTable(false);
    };

    if (resizingCol !== null || resizingTable) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [resizingCol, resizingTable, startX, startWidth]);

  const getCellKey = (row: number, col: number) => `${row}-${col}`;

  const handleCellUpdate = (row: number, col: number, value: string) => {
    const key = getCellKey(row, col);
    setCells((prev) => ({ ...prev, [key]: value }));
  };

  const setTextAlignment = (
    row: number,
    col: number,
    align: "left" | "center" | "right"
  ) => {
    const key = getCellKey(row, col);
    setAlignment((prev) => ({ ...prev, [key]: align }));
  };

  const addRow = () => {
    const newRows = rows + 1;
    setRows(newRows);
  };

  const addColumn = (_afterCol?: number) => {
    const newCols = cols + 1;
    setCols(newCols);
    setShowColMenu(null);
  };

  const deleteColumn = (colIndex: number) => {
    if (cols <= 1) return;

    const newCells = { ...cells };
    // Remove cells from deleted column
    for (let r = 0; r < rows; r++) {
      delete newCells[getCellKey(r, colIndex)];
    }

    // Shift cells from columns to the right left
    for (let c = colIndex + 1; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const oldKey = getCellKey(r, c);
        const newKey = getCellKey(r, c - 1);
        if (newCells[oldKey]) {
          newCells[newKey] = newCells[oldKey];
          delete newCells[oldKey];
        }
      }
    }

    // Reindex column widths: remove deleted column and shift remaining
    const newColumnWidths: { [key: number]: number } = {};
    for (let c = 0; c < cols; c++) {
      if (c < colIndex && columnWidths[c] !== undefined) {
        newColumnWidths[c] = columnWidths[c];
      } else if (c > colIndex && columnWidths[c] !== undefined) {
        newColumnWidths[c - 1] = columnWidths[c];
      }
    }

    setCells(newCells);
    setColumnWidths(newColumnWidths);
    setCols(cols - 1);
    setShowColMenu(null);
  };

  return (
    <div className="my-3 group">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <TableIcon className="w-4 h-4" />
          <span>Таблица</span>
          <span className="text-gray-400">
            {rows} × {cols}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg shadow transition-colors relative z-50"
          title="Удалить таблицу"
        >
          <Trash2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Table */}
      <div className="relative">
        <div className="inline-block relative" style={{ width: `${tableWidth}%` }}>
          <table 
            ref={tableRef}
            className="border-collapse bg-white/60 backdrop-blur-sm w-full shadow-sm"
            style={{ tableLayout: Object.keys(columnWidths).length > 0 ? 'fixed' : 'auto' }}
          >
            {Object.keys(columnWidths).length > 0 && (
              <colgroup>
                {Array.from({ length: cols }).map((_, colIndex) => (
                  <col 
                    key={colIndex} 
                    style={{ width: columnWidths[colIndex] ? `${columnWidths[colIndex]}px` : 'auto' }} 
                  />
                ))}
              </colgroup>
            )}
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="group/row">
                  {Array.from({ length: cols }).map((_, colIndex) => {
                    const cellKey = getCellKey(rowIndex, colIndex);
                    const isFirstRow = rowIndex === 0;
                    const isLastRow = rowIndex === rows - 1;
                    const isFirstCol = colIndex === 0;
                    const isLastCol = colIndex === cols - 1;
                    
                    // Determine border radius for corner cells
                    let borderRadius = '';
                    if (isFirstRow && isFirstCol) {
                      borderRadius = '15px 0 0 0';
                    } else if (isFirstRow && isLastCol) {
                      borderRadius = '0 15px 0 0';
                    } else if (isLastRow && isFirstCol) {
                      borderRadius = '0 0 0 15px';
                    } else if (isLastRow && isLastCol) {
                      borderRadius = '0 0 15px 0';
                    }
                    
                    return (
                      <td
                        key={colIndex}
                        className="border border-gray-300 p-0 relative group/cell"
                        style={{ borderRadius }}
                      >
                        {/* Column menu button (only show on first row) */}
                        {rowIndex === 0 && (
                          <div className="absolute -top-8 left-0 right-0 flex justify-center">
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setShowColMenu(
                                    showColMenu === colIndex ? null : colIndex
                                  )
                                }
                                className="p-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors border border-gray-300"
                                title="Опции колонки"
                              >
                                <ChevronDown className="w-3 h-3 text-gray-600" />
                              </button>
                              {showColMenu === colIndex && (
                                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[140px]">
                                  <button
                                    onClick={() => {
                                      // Insert column left - shift existing columns right first
                                      const newCells: { [key: string]: string } = {};
                                      // Copy cells, shifting columns at or after colIndex to the right
                                      for (let r = 0; r < rows; r++) {
                                        for (let c = 0; c < cols; c++) {
                                          const oldKey = getCellKey(r, c);
                                          if (cells[oldKey]) {
                                            if (c >= colIndex) {
                                              // Shift right
                                              newCells[getCellKey(r, c + 1)] = cells[oldKey];
                                            } else {
                                              // Keep in place
                                              newCells[oldKey] = cells[oldKey];
                                            }
                                          }
                                        }
                                      }
                                      // New column at colIndex is empty (no data added)
                                      setCells(newCells);
                                      setCols(cols + 1);
                                      setShowColMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Insert left
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Insert column right - shift columns after colIndex to the right
                                      const newCells: { [key: string]: string } = {};
                                      // Copy cells, shifting columns after colIndex to the right
                                      for (let r = 0; r < rows; r++) {
                                        for (let c = 0; c < cols; c++) {
                                          const oldKey = getCellKey(r, c);
                                          if (cells[oldKey]) {
                                            if (c > colIndex) {
                                              // Shift right
                                              newCells[getCellKey(r, c + 1)] = cells[oldKey];
                                            } else {
                                              // Keep in place
                                              newCells[oldKey] = cells[oldKey];
                                            }
                                          }
                                        }
                                      }
                                      // New column at colIndex+1 is empty (no data added)
                                      setCells(newCells);
                                      setCols(cols + 1);
                                      setShowColMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Insert right
                                  </button>
                                  {cols > 1 && (
                                    <>
                                      <div className="border-t border-gray-200 my-1"></div>
                                      <button
                                        onClick={() => deleteColumn(colIndex)}
                                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2"
                                      >
                                        <X className="w-3 h-3" />
                                        Delete column
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Alignment buttons */}
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-white/50 rounded shadow-md border border-gray-200/50 p-0.5 z-10 opacity-50 hover:opacity-100 hover:bg-white transition-opacity">
                          <button
                            onClick={() =>
                              setTextAlignment(rowIndex, colIndex, "left")
                            }
                            className={`p-1 hover:bg-gray-200 rounded transition-colors ${
                              (alignment[cellKey] || "left") === "left"
                                ? "bg-indigo-100 text-indigo-600"
                                : ""
                            }`}
                            title="По левому краю"
                          >
                            <AlignLeft className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() =>
                              setTextAlignment(rowIndex, colIndex, "center")
                            }
                            className={`p-1 hover:bg-gray-200 rounded transition-colors ${
                              alignment[cellKey] === "center"
                                ? "bg-indigo-100 text-indigo-600"
                                : ""
                            }`}
                            title="По центру"
                          >
                            <AlignCenter className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() =>
                              setTextAlignment(rowIndex, colIndex, "right")
                            }
                            className={`p-1 hover:bg-gray-200 rounded transition-colors ${
                              alignment[cellKey] === "right"
                                ? "bg-indigo-100 text-indigo-600"
                                : ""
                            }`}
                            title="По правому краю"
                          >
                            <AlignRight className="w-3 h-3" />
                          </button>
                        </div>

                        <div
                          ref={(el) => {
                            cellRefs.current[cellKey] = el;
                            // Set initial content only once
                            if (el && !el.textContent && cells[cellKey]) {
                              el.textContent = cells[cellKey];
                            }
                          }}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => {
                            handleCellUpdate(
                              rowIndex,
                              colIndex,
                              e.currentTarget.textContent || ""
                            );
                          }}
                          onFocus={() => setFocusedCell(cellKey)}
                          onBlur={(e) => {
                            setFocusedCell(null);
                            // Save final content on blur
                            handleCellUpdate(
                              rowIndex,
                              colIndex,
                              e.currentTarget.textContent || ""
                            );
                          }}
                          className={`min-w-[80px] min-h-[40px] px-3 py-2 outline-none focus:bg-blue-50/50 transition-colors text-gray-900 ${
                            focusedCell === cellKey ? "bg-blue-50/50" : ""
                          }`}
                          style={{
                            direction: "ltr",
                            textAlign: alignment[cellKey] || "left",
                          }}
                        />

                        {/* Column resize handle */}
                        <div
                          onMouseDown={(e) => handleColResizeStart(e, colIndex)}
                          className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 transition-colors z-20 ${
                            resizingCol === colIndex ? "bg-indigo-500" : "bg-transparent hover:bg-indigo-300"
                          }`}
                          title="Изменить ширину колонки"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table resize handle */}
          <div
            onMouseDown={handleTableResizeStart}
            className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-30 flex items-center justify-center ${
              resizingTable ? "bg-indigo-500" : "bg-transparent hover:bg-indigo-200"
            }`}
            title="Изменить ширину таблицы"
          >
            <div className="w-0.5 h-8 bg-indigo-400 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Table width indicator */}
        {tableWidth < 100 && (
          <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
            <span>Ширина: {Math.round(tableWidth)}%</span>
            <button
              onClick={() => setTableWidth(100)}
              className="text-indigo-600 hover:text-indigo-700 underline"
            >
              Сбросить
            </button>
          </div>
        )}
      </div>

      {/* Quick add buttons */}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={() => addRow()}
          className="text-sm text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить строку
        </button>
        <button
          onClick={() => addColumn()}
          className="text-sm text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить колонку
        </button>
      </div>
    </div>
  );
}