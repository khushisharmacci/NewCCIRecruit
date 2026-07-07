export function hasValue(value) {
  return value !== null &&
         value !== undefined &&
         String(value).trim() !== "";
}

export function normalize(value) {
  if (!hasValue(value)) return "";
  return String(value).trim().toLowerCase();
}