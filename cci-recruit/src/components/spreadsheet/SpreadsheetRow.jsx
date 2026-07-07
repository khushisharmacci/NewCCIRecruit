import SpreadsheetCell from "./SpreadsheetCell";

export default function SpreadsheetRow({
  candidate,
  index,
  selectedRows,
  setSelectedRows,
  updateCell,
}) {
  const checked = selectedRows.includes(candidate.id);

  function toggleRow() {
    if (checked) {
      setSelectedRows((prev) => prev.filter((id) => id !== candidate.id));
      return;
    }

    setSelectedRows((prev) => [...prev, candidate.id]);
  }

  return (
    <tr
      className="
        even:bg-[#1d2b3f]
        odd:bg-[#1a273b]
        hover:bg-blue-900/20
        transition-colors
      "
    >
      {/* Checkbox */}
      <td className="border border-slate-700 text-center w-10">
        <input
          type="checkbox"
          checked={checked}
          onChange={toggleRow}
          className="accent-blue-500"
        />
      </td>

      {/* Row Number */}
      <td className="border border-slate-700 text-center text-slate-400 w-12">{index + 1}</td>

      <SpreadsheetCell
        value={candidate.full_name}
        rowId={candidate.id}
        field="full_name"
        updateCell={updateCell}
      />

      <SpreadsheetCell
        value={candidate.email}
        rowId={candidate.id}
        field="email"
        updateCell={updateCell}
      />

      <SpreadsheetCell
        value={candidate.phone}
        rowId={candidate.id}
        field="phone"
        updateCell={updateCell}
      />

      <SpreadsheetCell
        value={candidate.status}
        rowId={candidate.id}
        field="status"
        updateCell={updateCell}
      />

      <SpreadsheetCell
        value={candidate.location}
        rowId={candidate.id}
        field="location"
        updateCell={updateCell}
      />
    </tr>
  );
}
