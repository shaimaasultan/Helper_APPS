// ===============================
// ELEMENTS
// ===============================
const imgInput = document.getElementById("imgInput");
const thresholdSlider = document.getElementById("threshold");
const thVal = document.getElementById("thVal");
const wallSlider = document.getElementById("wallThickness");
const wallVal = document.getElementById("wallVal");

const srcCanvas = document.getElementById("srcCanvas");
const mazeCanvas = document.getElementById("mazeCanvas");

const srcCtx = srcCanvas.getContext("2d");
const mazeCtx = mazeCanvas.getContext("2d");

let loadedImage = null;
let mazeGrid = null;      // 0 = free (white), 1 = wall (black)
let startPoint = null;
let targetPoint = null;


// ===============================
// UI UPDATES
// ===============================
thresholdSlider.oninput = () => thVal.textContent = thresholdSlider.value;
wallSlider.oninput = () => wallVal.textContent = wallSlider.value + " px";


// ===============================
// LOAD IMAGE
// ===============================
imgInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
        loadedImage = img;

        srcCanvas.width = img.width;
        srcCanvas.height = img.height;

        srcCtx.clearRect(0, 0, img.width, img.height);
        srcCtx.drawImage(img, 0, 0);
    };
    img.src = URL.createObjectURL(file);
};


// ===============================
// REAL WALL THICKNESS DETECTOR
// binary: 1 = dark, 0 = bright
// returns walls: 1 = wall, 0 = free
// ===============================
function detectWalls(binary, w, h, thickness) {
    const out = new Array(h);
    for (let y = 0; y < h; y++) {
        out[y] = new Array(w).fill(0);
    }

    const radius = Math.floor(thickness / 2);

    for (let y = radius; y < h - radius; y++) {
        for (let x = radius; x < w - radius; x++) {

            let darkCount = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (binary[y + dy][x + dx] === 1) {
                        darkCount++;
                    }
                }
            }

            const kernelSize = (radius * 2 + 1) ** 2;

            if (darkCount > kernelSize * 0.6) {
                out[y][x] = 1;
            }
        }
    }

    return out;
}


// ===============================
// DRAW MAZE (WALLS ONLY)
// ===============================
function drawMaze(walls, w, h) {
    mazeCtx.clearRect(0, 0, w, h);
    const out = mazeCtx.createImageData(w, h);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const val = walls[y][x] === 1 ? 0 : 255;

            out.data[idx]     = val;
            out.data[idx + 1] = val;
            out.data[idx + 2] = val;
            out.data[idx + 3] = 255;
        }
    }

    mazeCtx.putImageData(out, 0, 0);
}


// ===============================
// CLICK TO SET START/TARGET
// ===============================
mazeCanvas.addEventListener("click", e => {
    if (!mazeGrid) return;

    const rect = mazeCanvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    // must be free (white) pixel
    if (mazeGrid[y][x] === 1) {
        alert("You clicked on a wall. Choose a white (free) pixel.");
        return;
    }

    // if both already set, reset and start over
    if (startPoint && targetPoint) {
        startPoint = null;
        targetPoint = null;
        redrawMazeOnly();
    }

    if (!startPoint) {
        startPoint = { x, y };
        drawMarker(x, y, "green");
    } else if (!targetPoint) {
        targetPoint = { x, y };
        drawMarker(x, y, "red");
    }
});

function drawMarker(x, y, color) {
    mazeCtx.fillStyle = color;
    mazeCtx.fillRect(x - 2, y - 2, 5, 5);
}

function redrawMazeOnly() {
    if (!mazeGrid || !loadedImage) return;
    const w = loadedImage.width;
    const h = loadedImage.height;
    drawMaze(mazeGrid, w, h);
}


// ===============================
// PIXEL-BASED SHORTEST WHITE PATH
// maze: 0 = free, 1 = wall
// ===============================
// 8 directions : 4 cardinal + 4 diagonals to allow more natural paths and prevent corner cutting
function solvePixelShortestPath(start, target, maze) {
    const h = maze.length;
    const w = maze[0].length;

    const queue = [start];
    const visited = new Set();
    const parent = {};

    const key = (x, y) => `${x},${y}`;
    visited.add(key(start.x, start.y));

    const dirs = [
        [1, 0],  [-1, 0],  [0, 1],  [0, -1],   // 4-direction
        [1, 1],  [1, -1], [-1, 1], [-1, -1]   // diagonals
    ];

    while (queue.length > 0) {
        const { x, y } = queue.shift();

        if (x === target.x && y === target.y) {
            return parent;
        }

        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;

            // must be free pixel
            if (maze[ny][nx] !== 0) continue;

            // prevent diagonal corner cutting
            if (dx !== 0 && dy !== 0) {
                if (maze[y][x + dx] === 1 || maze[y + dy][x] === 1) {
                    continue;
                }
            }

            const k = key(nx, ny);
            if (!visited.has(k)) {
                visited.add(k);
                parent[k] = { x, y };
                queue.push({ x: nx, y: ny });
            }
        }
    }

    return null;
}


// 16 directions : 4 cardinal + 4 diagonals + 8 half‑diagonals (knight moves) to allow more natural paths and prevent corner cutting
//function solvePixelShortestPath(start, target, maze) {
//    const h = maze.length;
//    const w = maze[0].length;

//    const queue = [start];
//    const visited = new Set();
//    const parent = {};

//    const key = (x, y) => `${x},${y}`;
//    visited.add(key(start.x, start.y));

//    const dirs = [
//        [1, 0], [-1, 0], [0, 1], [0, -1],          // cardinal
//        [1, 1], [1, -1], [-1, 1], [-1, -1],        // diagonals
//        [2, 1], [2, -1], [-2, 1], [-2, -1],        // half‑diagonals
//        [1, 2], [-1, 2], [1, -2], [-1, -2]
//    ];

//    while (queue.length > 0) {
//        const { x, y } = queue.shift();

//        if (x === target.x && y === target.y) {
//            return parent;
//        }

//        for (const [dx, dy] of dirs) {
//            const nx = x + dx;
//            const ny = y + dy;

//            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;

//            // must be free pixel
//            if (maze[ny][nx] !== 0) continue;

//            // prevent corner cutting for any diagonal or half‑diagonal
//            if (Math.abs(dx) + Math.abs(dy) > 1) {
//                const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
//                const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
//
//                if (maze[y][x + stepX] === 1 || maze[y + stepY][x] === 1) {
//                    continue;
//                }
//            }

//            const k = key(nx, ny);
//            if (!visited.has(k)) {
//                visited.add(k);
//                parent[k] = { x, y };
//                queue.push({ x: nx, y: ny });
//            }
//        }
//    }
//
//    return null;
//}



// ===============================
// DRAW PATH
// ===============================
function drawPixelPath(parent) {
    let cur = `${targetPoint.x},${targetPoint.y}`;

    mazeCtx.fillStyle = "blue";

    while (cur in parent) {
        const [x, y] = cur.split(",").map(Number);
        mazeCtx.fillRect(x, y, 5, 5);
        cur = `${parent[cur].x},${parent[cur].y}`;
    }

    // redraw markers on top
    if (startPoint) drawMarker(startPoint.x, startPoint.y, "green");
    if (targetPoint) drawMarker(targetPoint.x, targetPoint.y, "red");
}


// ===============================
// SOLVE ENTRY POINT
// ===============================
function solveMaze() {
    if (!mazeGrid) {
        alert("Convert the image first.");
        return;
    }
    if (!startPoint || !targetPoint) {
        alert("Click to set START (green) and TARGET (red) on the maze.");
        return;
    }

    const parent = solvePixelShortestPath(startPoint, targetPoint, mazeGrid);

    if (!parent) {
        alert("No path found.");
        return;
    }

    redrawMazeOnly();
    drawPixelPath(parent);
}


// ===============================
// MAIN CONVERSION
// ===============================
function convertImage() {
    if (!loadedImage) {
        alert("Load an image first.");
        return;
    }

    startPoint = null;
    targetPoint = null;

    const thickness = parseInt(wallSlider.value, 10);

    const w = loadedImage.width;
    const h = loadedImage.height;

    mazeCanvas.width = w;
    mazeCanvas.height = h;

    const imgData = srcCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const threshold = parseInt(thresholdSlider.value, 10);

    // STEP 1 — RAW THRESHOLD (1 = dark, 0 = bright)
    const binary = new Array(h);
    for (let y = 0; y < h; y++) {
        binary[y] = new Array(w);
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const brightness = (r + g + b) / 3;

            binary[y][x] = brightness > threshold ? 0 : 1;
        }
    }

    // STEP 2 — WALL THICKNESS
    const walls = detectWalls(binary, w, h, thickness);

    // mazeGrid: 0 = free, 1 = wall
    mazeGrid = walls;

    drawMaze(walls, w, h);
}

// ===============================
// ORGANIC MAZE GENERATOR (NO IMAGE NEEDED)
// ===============================
// ===============================
// REACTION–DIFFUSION ORGANIC MAZE GENERATOR
// ===============================
function generateOrganicMaze(width, height) {
    mazeCanvas.width = width;
    mazeCanvas.height = height;

    // Gray–Scott fields
    let A = [];
    let B = [];

    for (let y = 0; y < height; y++) {
        A[y] = [];
        B[y] = [];
        for (let x = 0; x < width; x++) {
            A[y][x] = 1;
            B[y][x] = 0;
        }
    }

    // seed B chemical blobs
    for (let i = 0; i < 40; i++) {
        const cx = Math.floor(Math.random() * width);
        const cy = Math.floor(Math.random() * height);
        for (let y = -4; y <= 4; y++) {
            for (let x = -4; x <= 4; x++) {
                const nx = cx + x;
                const ny = cy + y;
                if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
                    B[ny][nx] = 1;
                }
            }
        }
    }

    // Gray–Scott parameters (these produce maze-like patterns)
    const feed = 0.0367;
    const kill = 0.0649;
    const diffA = 1.0;
    const diffB = 0.5;

    // Laplacian helper
    function laplacian(grid, x, y) {
        let sum = 0;
        sum += grid[y][x] * -1;
        sum += grid[y][x - 1] * 0.2 || 0;
        sum += grid[y][x + 1] * 0.2 || 0;
        sum += grid[y - 1]?.[x] * 0.2 || 0;
        sum += grid[y + 1]?.[x] * 0.2 || 0;
        sum += grid[y - 1]?.[x - 1] * 0.05 || 0;
        sum += grid[y - 1]?.[x + 1] * 0.05 || 0;
        sum += grid[y + 1]?.[x - 1] * 0.05 || 0;
        sum += grid[y + 1]?.[x + 1] * 0.05 || 0;
        return sum;
    }

    // Run simulation
    for (let iter = 0; iter < 12000; iter++) {
        let nextA = [];
        let nextB = [];
        for (let y = 0; y < height; y++) {
            nextA[y] = [];
            nextB[y] = [];
            for (let x = 0; x < width; x++) {
                const a = A[y][x];
                const b = B[y][x];

                const lapA = laplacian(A, x, y);
                const lapB = laplacian(B, x, y);

                const reaction = a * b * b;

                nextA[y][x] = a + (diffA * lapA - reaction + feed * (1 - a));
                nextB[y][x] = b + (diffB * lapB + reaction - (kill + feed) * b);
            }
        }
        A = nextA;
        B = nextB;
    }

    // Convert to mazeGrid (threshold)
    mazeGrid = Array.from({ length: height }, () => Array(width).fill(1));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const v = A[y][x] - B[y][x];
            mazeGrid[y][x] = v > 0 ? 0 : 1; // white corridor / black wall
        }
    }

    drawMaze(mazeGrid, width, height);

    loadedImage = { width, height, isGenerated: true };
    startPoint = null;
    targetPoint = null;
}

// helper: count white neighbors
function countWhiteNeighbors(x, y, grid) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (grid[y + dy][x + dx] === 0) count++;
        }
    }
    return count;
}
