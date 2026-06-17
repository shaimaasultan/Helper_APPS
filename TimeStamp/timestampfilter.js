let files = [];

document.getElementById('folderInput').addEventListener('change', (event) => {
  files = Array.from(event.target.files);
});

function filterFiles() {
  const from = new Date(document.getElementById('fromTimestamp').value);
  const to = new Date(document.getElementById('toTimestamp').value);
  const tbody = document.querySelector('#resultsTable tbody');
  const spinner = document.getElementById('spinner');
  const status = document.getElementById('status');

  spinner.style.display = 'block';
  status.textContent = '';
  tbody.innerHTML = '';

  setTimeout(() => {
    let count = 0;
    const folderMap = new Map();           // inferred folders from file paths
    const folderOwnTimestamp = new Map();  // actual folder timestamps from zero-byte entries

    files.forEach(file => {
      const modified = new Date(file.lastModified);
      const fullPath = file.webkitRelativePath || file.name;

      // Track folders from file paths
      const parts = fullPath.split('/');
      for (let i = 0; i < parts.length - 1; i++) {
        const folderPath = parts.slice(0, i + 1).join('/');
        if (!folderMap.has(folderPath) || folderMap.get(folderPath) < modified) {
          folderMap.set(folderPath, modified);
        }
      }

      // Track actual folder timestamps from zero-byte entries
      if (file.size === 0 && fullPath.endsWith('/')) {
  	const folderPath = fullPath.slice(0, -1);
  	folderOwnTimestamp.set(folderPath, new Date(file.lastModified)); // this is the folder's own timestamp
      }

      // Filter files
      if (modified >= from && modified <= to) {
        const row = `<tr>
          <td>${file.name}</td>
          <td>${modified.toLocaleString()}</td>
          <td>${(file.size / 1024).toFixed(2)}</td>
          <td>File</td>
          <td>${fullPath}</td>
        </tr>`;
        tbody.innerHTML += row;
        count++;
      }
    });

    // Filter folders using own timestamp if available, otherwise inferred
    folderMap.forEach((inferredTime, folderPath) => {
      const modTime = folderOwnTimestamp.get(folderPath) || inferredTime;
      if (modTime >= from && modTime <= to) {
        const row = `<tr>
          <td>${folderPath.split('/').pop()}</td>
          <td>${modTime.toLocaleString()}</td>
          <td>—</td>
          <td>Folder</td>
          <td>${folderPath}</td>
        </tr>`;
        tbody.innerHTML += row;
        count++;
      }
    });

    spinner.style.display = 'none';
    status.textContent = `✅ Done! ${count} item(s) matched.`;
  }, 500);
}

function sortTable(colIndex) {
  const table = document.getElementById("resultsTable");
  const rows = Array.from(table.rows).slice(2); // skip header + search
  const sorted = rows.sort((a, b) => {
    const valA = a.cells[colIndex].textContent.toLowerCase();
    const valB = b.cells[colIndex].textContent.toLowerCase();
    return valA.localeCompare(valB, undefined, { numeric: true });
  });
  const tbody = table.tBodies[0];
  tbody.innerHTML = '';
  sorted.forEach(row => tbody.appendChild(row));
}

function searchTable(colIndex) {
  const input = document.querySelectorAll("thead tr:nth-child(2) input")[colIndex].value.toLowerCase();
  const rows = document.querySelectorAll("#resultsTable tbody tr");
  rows.forEach(row => {
    const cell = row.cells[colIndex];
    row.style.display = cell.textContent.toLowerCase().includes(input) ? "" : "none";
  });

  const visibleRows = Array.from(rows).filter(row => row.style.display !== "none");
  document.getElementById("status").textContent = `🔍 ${visibleRows.length} item(s) match search criteria.`;
}