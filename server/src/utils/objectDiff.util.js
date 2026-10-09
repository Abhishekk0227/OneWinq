/**
 * Field-level object diffing utility specified in the OneWinq Enterprise blueprint.
 * Compares two objects and produces a granular list of changes:
 * [ { field: 'bio', oldValue: '...', newValue: '...' } ]
 */
export function calculateObjectDiff(oldObj = {}, newObj = {}, prefix = '') {
  const diffs = [];
  const oldData = oldObj || {};
  const newData = newObj || {};

  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));

  for (const key of allKeys) {
    // Ignore internal timestamp or metadata keys
    if (['_id', '__v', 'createdAt', 'updatedAt', 'id'].includes(key)) {
      continue;
    }

    const fullField = prefix ? `${prefix}.${key}` : key;
    const oldVal = oldData[key];
    const newVal = newData[key];

    // Check if both are objects (and not arrays / null)
    if (
      oldVal &&
      newVal &&
      typeof oldVal === 'object' &&
      typeof newVal === 'object' &&
      !Array.isArray(oldVal) &&
      !Array.isArray(newVal)
    ) {
      const nestedDiffs = calculateObjectDiff(oldVal, newVal, fullField);
      diffs.push(...nestedDiffs);
    } else {
      // Primitive or array comparison
      const oldStr = JSON.stringify(oldVal === undefined ? null : oldVal);
      const newStr = JSON.stringify(newVal === undefined ? null : newVal);

      if (oldStr !== newStr) {
        diffs.push({
          field: fullField,
          oldValue: oldVal ?? null,
          newValue: newVal ?? null,
        });
      }
    }
  }

  return diffs;
}
