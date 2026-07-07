import { memo } from "react";

function SpreadsheetCell({ value, rowId, field, updateCell }) {
  // controlled input: value is provided and updateCell will update local state
  return (
    <td className="border border-slate-700 p-0">
      <input
        value={value ?? ""}
        spellCheck={false}
        autoComplete="off"
        className="
          w-full
          bg-transparent
          px-3
          py-2
          text-sm
          text-white
          outline-none
          transition
          focus:bg-blue-900/20
          focus:ring-1
          focus:ring-blue-500
        "
        onFocus={(e) => e.target.select()}
        onChange={(e) => updateCell(rowId, field, e.target.value)}
      />
    </td>
  );
}

export default memo(SpreadsheetCell);
