export default function ColumnInspector({ selectedCell }) {
    if (!selectedCell) return null;

    return (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex gap-4 text-xs text-gray-500 mb-1">
                <span>Row {selectedCell.rowIndex}</span>
                <span className="font-semibold text-gray-800">
                    {selectedCell.column}
                </span>
            </div>

            <input
  readOnly
  value={selectedCell.value ?? ""}
  className="
    w-full
    h-8
    px-3
    rounded
    border
    border-gray-300
    bg-white
    text-black
    placeholder:text-gray-500
    focus:outline-none
    focus:ring-0
    focus:border-gray-300
  "
/>
        </div>
    );
}