// Centralized mapping between spreadsheet headers and candidate table fields
const HEADER_TO_FIELD = {
  "SR.NO.": "row_order",
  "CANDIDATE NAME": "full_name",
  "CURRENT ORG": "current_company",
  "CONTACT NUMBER": "phone",
  "EMAIL ID": "email",
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
  "REMARKS by Deepali": "remarks",
};

function normalizeHeader(h) {
  if (!h && h !== 0) return "";
  return String(h).trim().toUpperCase();
}

function mapRowToCandidate(row, headerToField = HEADER_TO_FIELD) {
  const candidate = {};
  for (const key of Object.keys(row)) {
    const normalized = normalizeHeader(key);
    const field = headerToField[normalized] || key;
    candidate[field] = row[key];
  }
  return candidate;
}

export { HEADER_TO_FIELD, normalizeHeader, mapRowToCandidate };
