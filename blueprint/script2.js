let startCell = null;
let endCell = null;
let caveMap = null;

function generateCave(W, H, fillChance, smoothCount) {
  let map = [];

  // Initial random fill
  for (let y = 0; y < H; y++) {
    map[y] = [];
    for (let x = 0; x < W; x++) {
      map[y][x] = Math.random() < fillChance ? 1 : 0;
    }
  }

  // Density balancing (C2)
  const targetDensity = 0.50;
  const density = fillChance;
  let bias = 0;

  if (density > targetDensity) bias = -0.15;
  if (density < targetDensity) bias = +0.15;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (Math.random() < Math.abs(bias)) {
        map[y][x] = bias > 0 ? 1 : 0;
      }
    }
  }

  // Smoothing
  for (let i = 0; i < smoothCount; i++) {
    map = smooth(map, W, H);
  }

  // Curvy erosion
  for (let i = 0; i < 2; i++) {
    map = erode(map, W, H);
  }

  // Connectivity
  map = floodFillConnect(map, W, H);

  return map;
}

function smooth(map, W, H) {
  const newMap = map.map(r => r.slice());

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let walls = 0;

      for (let yy = -1; yy <= 1; yy++) {
        for (let xx = -1; xx <= 1; xx++) {
          if (map[y + yy][x + xx] === 1) walls++;
        }
      }

      newMap[y][x] = walls >= 5 ? 1 : 0;
    }
  }

  return newMap;
}

function erode(map, W, H) {
  const newMap = map.map(r => r.slice());

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (map[y][x] === 1) {
        let open = 0;

        for (let yy = -1; yy <= 1; yy++) {
          for (let xx = -1; xx <= 1; xx++) {
            if (map[y + yy][x + xx] === 0) open++;
          }
        }

        if (open >= 4) newMap[y][x] = 0;
      }
    }
  }

  return newMap;
}

function floodFillConnect(map, W, H) {
  const visited = Array.from({ length: H }, () => Array(W).fill(false));
  const regions = [];

  function flood(x, y) {
    const stack = [[x, y]];
    const cells = [];
    visited[y][x] = true;

    while (stack.length) {
      const [cx, cy] = stack.pop();
      cells.push([cx, cy]);

      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          if (!visited[ny][nx] && map[ny][nx] === 0) {
            visited[ny][nx] = true;
            stack.push([nx, ny]);
          }
        }
      }
    }
    return cells;
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!visited[y][x] && map[y][x] === 0) {
        regions.push(flood(x, y));
      }
    }
  }

  if (regions.length === 0) return map;

  let largest = regions.sort((a, b) => b.length - a.length)[0];

  const newMap = map.map(r => r.slice());
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      newMap[y][x] = 1;
    }
  }
  for (const [x, y] of largest) {
    newMap[y][x] = 0;
  }

  return newMap;
}

function drawCave() {
  const W = parseInt(document.getElementById("paramW").value);
  const H = parseInt(document.getElementById("paramH").value);
  const CELL = parseInt(document.getElementById("paramCELL").value);
  const fillChance = parseFloat(document.getElementById("paramFill").value);
  const smoothCount = parseInt(document.getElementById("paramSmooth").value);

  const canvas = document.getElementById("c");
  canvas.width = W * CELL;
  canvas.height = H * CELL;
  const ctx = canvas.getContext("2d");

  caveMap = generateCave(W, H, fillChance, smoothCount);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (caveMap[y][x] === 0) {
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  startCell = null;
  endCell = null;
}

function drawMarker(ctx, cellX, cellY, color) {
  const CELL = parseInt(document.getElementById("paramCELL").value);
  const px = cellX * CELL + CELL / 2;
  const py = cellY * CELL + CELL / 2;
  ctx.fillStyle = color;
  ctx.fillRect(px - 1, py - 1, 3, 3); // 3×3 marker
}

function solvePathGrid() {
  if (!startCell || !endCell || !caveMap) return;

  const W = caveMap[0].length;
  const H = caveMap.length;
  const CELL = parseInt(document.getElementById("paramCELL").value);
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const queue = [startCell];
  const visited = Array.from({ length: H }, () => Array(W).fill(false));
  const parent = Array.from({ length: H }, () => Array(W).fill(null));

  visited[startCell.y][startCell.x] = true;

  const dirs = [
    [1,0],[-1,0],[0,1],[0,-1],
    [1,1],[1,-1],[-1,1],[-1,-1] // 8‑direction
  ];

  while (queue.length) {
    const p = queue.shift();

    if (p.x === endCell.x && p.y === endCell.y) {
      // Reconstruct path
      let cur = p;
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 1;
      ctx.beginPath();

      while (cur) {
        const cx = cur.x * CELL + CELL / 2;
        const cy = cur.y * CELL + CELL / 2;
        ctx.lineTo(cx, cy);
        cur = parent[cur.y][cur.x];
      }

      ctx.stroke();
      return;
    }

    for (const [dx, dy] of dirs) {
      const nx = p.x + dx;
      const ny = p.y + dy;

      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (visited[ny][nx]) continue;
      if (caveMap[ny][nx] === 1) continue; // wall

      visited[ny][nx] = true;
      parent[ny][nx] = p;
      queue.push({x: nx, y: ny});
    }
  }

  alert("No path found.");
}

document.getElementById("c").addEventListener("click", (e) => {
  const CELL = parseInt(document.getElementById("paramCELL").value);
  const canvas = e.target;
  const rect = canvas.getBoundingClientRect();
  const px = Math.floor(e.clientX - rect.left);
  const py = Math.floor(e.clientY - rect.top);

  const cellX = Math.floor(px / CELL);
  const cellY = Math.floor(py / CELL);

  if (!caveMap || caveMap[cellY]?.[cellX] === undefined) return;
  if (caveMap[cellY][cellX] === 1) return; // clicked on wall → ignore

  const ctx = canvas.getContext("2d");

  if (!startCell) {
    startCell = {x: cellX, y: cellY};
    drawMarker(ctx, cellX, cellY, "red");
  } else if (!endCell) {
    endCell = {x: cellX, y: cellY};
    drawMarker(ctx, cellX, cellY, "blue");
    solvePathGrid();
  }
});

document.getElementById("generate").onclick = drawCave;

document.getElementById("download").onclick = () => {
  const a = document.createElement("a");
  a.download = "cave.png";
  a.href = document.getElementById("c").toDataURL();
  a.click();
};

drawCave();
