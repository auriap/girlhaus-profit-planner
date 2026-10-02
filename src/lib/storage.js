/**
 * Local persistence and file export.
 *
 * Everything stays in the browser. No account, no server-side database.
 * Export writes a .json file so a plan can be saved, emailed, or moved
 * to another device.
 */

const KEY = 'girlhaus-profit-planner-v1';

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function exportFile(state, filename) {
  const name =
    filename ||
    `${(state.scenarios?.[0]?.name || 'event-plan')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${new Date().toISOString().slice(0, 10)}.json`;

  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.scenarios)) {
          reject(new Error('That file does not look like a saved event plan.'));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error('That file could not be read as JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('The file could not be opened.'));
    reader.readAsText(file);
  });
}
