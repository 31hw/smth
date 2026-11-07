export function chunk(arr, size = 1) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const step = Math.max(1, Number(size) || 1);
  const out = [];
  for (let i = 0; i < arr.length; i += step) {
    out.push(arr.slice(i, i + step));
  }
  return out;
}

export function forEach(collection, iteratee) {
  if (!collection || typeof iteratee !== 'function') return collection;
  if (Array.isArray(collection)) {
    for (let i = 0; i < collection.length; i++) {
      if (iteratee(collection[i], i, collection) === false) break;
    }
  } else if (typeof collection === 'object') {
    for (const key of Object.keys(collection)) {
      if (iteratee(collection[key], key, collection) === false) break;
    }
  }
  return collection;
}

export default { chunk, forEach };
