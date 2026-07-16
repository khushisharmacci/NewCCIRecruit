import { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import {
    ModuleRegistry,
    AllCommunityModule,
} from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import ColumnInspector from "./ColumnInspector";

ModuleRegistry.registerModules([
    AllCommunityModule,
]);

import { Button } from "@/components/ui/button";
import SpreadsheetToolbar from "./SpreadsheetToolbar";
import useSpreadsheet from "./useSpreadsheet";
import { syncRowToCandidate, saveSpreadsheetRows } from "@/lib/syncService";

export default function SpreadsheetViewer({
    file,
    onClose,
}) {
    const spreadsheet = useSpreadsheet(file.id);
    const [selectedCell, setSelectedCell] = useState(null);

    // Global keyboard listener for Ctrl + Z / Cmd + Z
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            if (isCtrl && e.key.toLowerCase() === "z") {
                const activeEl = document.activeElement;
                
                // Allow browser default undo inside search inputs, but override on cells
                if (
                    activeEl && 
                    (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") &&
                    !activeEl.classList.contains("ag-cell-edit-input")
                ) {
                    return;
                }

                e.preventDefault();
                spreadsheet.undo();
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => {
            window.removeEventListener("keydown", handleGlobalKeyDown);
        };
    }, [spreadsheet]);

    const onCellClicked = ({ data, colDef, rowIndex }) => {
        if (!data) return;

        setSelectedCell({
            rowIndex: rowIndex + 1,
            column: colDef.headerName,
            value: data[colDef.field],
        });
    };

    const onCellKeyDown = async (e) => {
        const keyEvent = e.event;
        if (!keyEvent) return;

        const isCtrl = keyEvent.ctrlKey || keyEvent.metaKey;

        // ─── CTRL + C (Copy Cell) ───
        if (isCtrl && keyEvent.key.toLowerCase() === "c") {
            const api = e.api;
            const cell = api.getFocusedCell();
            if (!cell) return;

            const rowNode = api.getDisplayedRowAtIndex(cell.rowIndex);
            if (!rowNode) return;

            const colId = cell.column.getId();
            const value = rowNode.data[colId] ?? "";

            try {
                await navigator.clipboard.writeText(String(value));
            } catch (err) {
                console.error("Failed to copy cell text to clipboard:", err);
            }
        }

        // ─── CTRL + V (Paste Range) ───
        if (isCtrl && keyEvent.key.toLowerCase() === "v") {
            const api = e.api;
            const cell = api.getFocusedCell();
            if (!cell) return;

            try {
                const text = await navigator.clipboard.readText();
                if (!text) return;

                const clipboardRows = text.split(/\r?\n/).map(row => row.split("\t"));
                const columns = (api.getColumns ? api.getColumns() : api.getAllGridColumns ? api.getAllGridColumns() : []) || [];
                const focusedColIndex = columns.indexOf(cell.column);

                if (focusedColIndex === -1) return;

                clipboardRows.forEach((rowValues, rowIndexOffset) => {
                    if (rowIndexOffset === clipboardRows.length - 1 && rowValues.length === 1 && !rowValues[0]) {
                        return;
                    }

                    const targetRowIndex = cell.rowIndex + rowIndexOffset;
                    const rowNode = api.getDisplayedRowAtIndex(targetRowIndex);
                    if (!rowNode) return;

                    rowValues.forEach((cellValue, colIndexOffset) => {
                        const targetColIndex = focusedColIndex + colIndexOffset;
                        if (targetColIndex >= columns.length) return;

                        const targetCol = columns[targetColIndex];
                        if (!targetCol.isCellEditable(rowNode)) return;

                        const colId = targetCol.getId();
                        const oldValue = rowNode.data[colId];
                        const cleanNewValue = String(cellValue).trim();
                        const cleanOldValue = oldValue === undefined || oldValue === null ? "" : String(oldValue).trim();

                        if (cleanOldValue !== cleanNewValue) {
                            rowNode.setDataValue(colId, cleanNewValue);
                        }
                    });
                });
            } catch (err) {
                console.error("Failed to paste spreadsheet range from clipboard:", err);
            }
        }

        // ─── CTRL + Z (Grid Undo Shortcut) ───
        if (isCtrl && keyEvent.key.toLowerCase() === "z") {
            keyEvent.preventDefault();
            spreadsheet.undo();
        }
    };

    const columnDefs = (spreadsheet.columns ?? []).map((column, index) => {
        const isSrNo = column.toLowerCase() === "sr no" || column.toLowerCase() === "sr. no" || column.toLowerCase() === "sr.no.";
        return {
            field: column,
            headerName: column,
            valueGetter: (params) => params.data ? params.data[column] : null,
            valueSetter: (params) => {
                if (params.data) {
                    params.data[column] = params.newValue;
                    return true;
                }
                return false;
            },
            editable: true,
            sortable: true,
            filter: isSrNo ? "agNumberColumnFilter" : true,
            floatingFilter: true,
            resizable: true,
            checkboxSelection: index === 0,
            headerCheckboxSelection: index === 0,
            comparator: isSrNo ? (valueA, valueB) => {
                const numA = parseInt(String(valueA ?? "").replace(/[^0-9]/g, ""), 10);
                const numB = parseInt(String(valueB ?? "").replace(/[^0-9]/g, ""), 10);
                if (isNaN(numA) && isNaN(numB)) return 0;
                if (isNaN(numA)) return 1;
                if (isNaN(numB)) return -1;
                return numA - numB;
            } : undefined
        };
    });

    if (spreadsheet.error) {
        return (
            <div className="fixed inset-0 bg-[#162234] flex items-center justify-center">
                <div className="text-red-400">
                    Failed to load spreadsheet.
                </div>
            </div>
        );
    }

    if (spreadsheet.isLoading) {
        return (
            <div className="fixed inset-0 bg-[#162234] flex items-center justify-center">
                <div className="text-white">
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center">
            <div className="w-[97vw] h-[94vh] bg-[#162234] rounded-xl border border-slate-700 shadow-2xl flex flex-col">
                <div className="h-16 border-b border-slate-700 bg-[#1b2940] flex items-center justify-between px-6">
                    <h2 className="text-xl font-semibold text-white">
                        {file.original_filename || file.name}
                    </h2>
                    <Button
                        variant="destructive"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                </div>

                <SpreadsheetToolbar
                    search={spreadsheet.search}
                    setSearch={spreadsheet.setSearch}
                    rows={spreadsheet.rows}
                    saving={spreadsheet.saving}
                    undo={spreadsheet.undo}
                    canUndo={spreadsheet.canUndo}
                    addRow={spreadsheet.addRow}
                    deleteRows={spreadsheet.deleteRows}
                    selectedRows={spreadsheet.selectedRows}
                    exportCSV={spreadsheet.exportCSV}
                    syncToCandidates={spreadsheet.syncToCandidates}
                />

                <div className="flex-1 pb-12">
                    <div
                        className="ag-theme-quartz-dark flex-1"
                        style={{
                            width: "100%",
                            height: "100%",
                        }}
                    >
                        <ColumnInspector selectedCell={selectedCell} />

                        <AgGridReact
                            headerHeight={48}
                            groupHeaderHeight={48}
                            enableCellTextSelection={true}
                            ensureDomOrder={true}
                            suppressClipboardPaste={false}
                            copyHeadersToClipboard={false}
                            onCellClicked={onCellClicked}
                            onCellKeyDown={onCellKeyDown}
                            onSelectionChanged={(event) => {
                                const selectedNodes = event.api.getSelectedNodes();
                                const selectedIds = selectedNodes.map(node => node.data.__id);
                                spreadsheet.setSelectedRows(selectedIds);
                            }}
                            rowData={spreadsheet.filteredRows}
                            getRowId={(params) => params.data.__id}
                            columnDefs={columnDefs}
                            singleClickEdit={false}
                            stopEditingWhenCellsLoseFocus={true}
                            enterNavigatesVertically={true}
                            enterNavigatesVerticallyAfterEdit={true}
                            defaultColDef={{
                                editable: true,
                                sortable: true,
                                filter: true,
                                floatingFilter: true,
                                resizable: true,
                                flex: 1,
                                minWidth: 150,
                            }}
                            animateRows
                            rowSelection="multiple"
                            onCellValueChanged={async (params) => {
                                await spreadsheet.updateCell(
                                    params.data.__id,
                                    params.colDef.field,
                                    params.newValue
                                );

                                if (params.data._candidate_id) {
                                    try {
                                        const result = await syncRowToCandidate(
                                            params.data,
                                            {
                                                ...file,
                                                columns: spreadsheet.columns,
                                                rows_data: spreadsheet.rows,
                                            }
                                        );

                                        if (result?.row) {
                                            Object.assign(params.data, result.row);
                                            await saveSpreadsheetRows(
                                                file.id,
                                                spreadsheet.rows
                                            );
                                        }
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="h-12 border-t border-slate-700 bg-[#1b2940] flex items-center px-2 gap-2">
                    <Button variant="secondary">
                        Sheet1
                    </Button>
                </div>
            </div>
        </div>
    );
}