import { useState } from "react";
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


export default function SpreadsheetViewer({
    file,
    onClose,
}) {

    const spreadsheet = useSpreadsheet(file.id);
    
    const FIELD_MAPPING = {
  "SR.NO.": "row_order",
  "CANDIDATE NAME": "full_name",
  "EMAIL ID": "email",
  "CONTACT NUMBER": "phone",
  "CURRENT ORG": "current_company",
  "ACADEMICS": "academics",
  "CURRENT FIXED CTC": "current_ctc",
  "POSITION": "position",
  "LOCATION": "location",
  "SENT ON": "sent_on",
  "SOURCED BY": "sourced_by",
  "HR": "hr",
  "LINKEDIN PROFILE LINK": "linkedin",
  "UPDATED BY": "updated_by",
  "REMARKS By Sir": "remarks",
};

 const [selectedCell, setSelectedCell] = useState(null);
    

    const onCellClicked = ({ data, colDef, rowIndex }) => {
    if (!data) return;

    setSelectedCell({
        rowIndex: rowIndex + 1,
        column: colDef.headerName,
        value: data[colDef.field],
    });
};

const [activeSheet, setActiveSheet] = useState(0);


    const columnDefs = (spreadsheet.columns ?? []).map((column) => {
    if (column === "SR.NO.") {
        return {
            field: column,
            headerName: column,
            editable: false,
            width: 90,
            valueGetter: (params) => params.node.rowIndex + 1,
        };
    }

    return {
        field: column,
        headerName: column,
        editable: true,
        sortable: true,
        filter: true,
        floatingFilter: true,
        resizable: true,
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
                    refetch={spreadsheet.refetch}
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


<div className="h-12 border-t ...">
<div className="h-12 border-t border-slate-700 bg-[#1b2940] flex items-center px-2 gap-2">

    <Button variant="secondary">
        Sheet1
    </Button>

    <Button
    variant="outline"
    onClick={() => {
        const newSheet = {
            id: crypto.randomUUID(),
            name: `Sheet${sheets.length + 1}`,
            columns: [...currentSheet.columns],
            rows: [],
        };

        setSheets([...sheets, newSheet]);
        setActiveSheet(sheets.length);
    }}
>
    +
</Button>

</div>
</div>
                </div>

            </div>

        
    );
}