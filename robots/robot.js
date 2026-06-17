// ======================= MAP / MAZE GENERATOR =======================
function createMap(w, h) {
    if (w < 3) w = 3;
    if (h < 3) h = 3;

    const grid = [];
    for (let y = 0; y < h; y++) {
        grid[y] = [];
        for (let x = 0; x < w; x++) grid[y][x] = 1; // 1 = obstacle
    }

    const W = (w % 2 === 0) ? w - 1 : w;
    const H = (h % 2 === 0) ? h - 1 : h;

    let sx = 1, sy = 1;
    grid[sy][sx] = 0;

    const stack = [{x:sx, y:sy}];
    const dirs = [
        {dx: 2, dy: 0},
        {dx:-2, dy: 0},
        {dx: 0, dy: 2},
        {dx: 0, dy:-2}
    ];

    while (stack.length > 0) {
        const cell = stack[stack.length - 1];
        const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
        let carved = false;

        for (const d of shuffled) {
            const nx = cell.x + d.dx;
            const ny = cell.y + d.dy;

            if (nx > 0 && nx < W && ny > 0 && ny < H && grid[ny][nx] === 1) {
                grid[cell.y + d.dy/2][cell.x + d.dx/2] = 0;
                grid[ny][nx] = 0;
                stack.push({x:nx, y:ny});
                carved = true;
                break;
            }
        }

        if (!carved) stack.pop();
    }

    return grid;
}

// ======================= FIND NEAREST FREE CELL =======================
function findNearestFree(grid, sx, sy) {
    const h = grid.length;
    const w = grid[0].length;
    const q = [{x:sx, y:sy}];
    const seen = new Set([sx + "_" + sy]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    while (q.length) {
        const {x,y} = q.shift();
        if (x>=0 && x<w && y>=0 && y<h && grid[y][x] === 0) return {x,y};
        for (const [dx,dy] of dirs) {
            const nx = x+dx, ny = y+dy;
            const k = nx+"_"+ny;
            if (nx>=0 && nx<w && ny>=0 && ny<h && !seen.has(k)) {
                seen.add(k);
                q.push({x:nx, y:ny});
            }
        }
    }
    return {x:sx,y:sy};
}

// ======================= GLOBALS =======================
let grid = null;
let mapCanvas = document.createElement("canvas");
let mapCtx = mapCanvas.getContext("2d");

const view = document.getElementById("view");
const ctx = view.getContext("2d");
view.focus();

// robot position (in grid coordinates)
let robotX = 1;
let robotY = 1;

// target position
let targetX = 0;
let targetY = 0;

let speedMultiplier = 5;
let baseSpeed = 0.2;

let solving = false;
let pathCells = [];

let solveStartTime = 0;

// ======================= SPEED SLIDER =======================
function updateSpeed() {
    speedMultiplier = parseInt(document.getElementById("speedSlider").value);
    document.getElementById("speedValue").textContent = speedMultiplier;
}

// ======================= COLLISION =======================
function isFreeCell(x, y) {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (!grid || py < 0 || py >= grid.length || px < 0 || px >= grid[0].length) return false;
    return grid[py][px] === 0;
}

// ======================= DRAW MAP =======================
function drawMapToCanvas(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    mapCanvas.width = cols;
    mapCanvas.height = rows;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            mapCtx.fillStyle = grid[y][x] === 1 ? "black" : "white";
            mapCtx.fillRect(x, y, 1, 1);
        }
    }
}

// ======================= CLICK TO SET TARGET =======================
view.addEventListener("click", e => {
    if (!grid) return;
    const rect = view.getBoundingClientRect();
    const scaleX = mapCanvas.width / view.width;
    const scaleY = mapCanvas.height / view.height;

    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const gx = Math.floor(cx);
    const gy = Math.floor(cy);

    if (isFreeCell(gx, gy)) {
        targetX = gx;
        targetY = gy;
    }
});

// ======================= SOLVER (BFS) =======================
function solveRobotPath() {
    if (!grid) return;

    solveStartTime = performance.now();

    const start = {
        x: Math.floor(robotX),
        y: Math.floor(robotY)
    };

    if (!isFreeCell(start.x, start.y)) {
        alert("Robot start is inside an obstacle. Regenerate map.");
        return;
    }

    const goal = { x: targetX, y: targetY };

    if (!isFreeCell(goal.x, goal.y)) {
        alert("Target is inside an obstacle. Choose another target.");
        return;
    }

    const queue = [start];
    const visited = new Set([start.x+"_"+start.y]);
    const parent = {};
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    function key(x,y){ return x+"_"+y; }

    while (queue.length > 0) {
        const cur = queue.shift();

        if (cur.x === goal.x && cur.y === goal.y) {
            let p = key(cur.x,cur.y);
            const rev = [{x:goal.x, y:goal.y}];
            while (p in parent) {
                const [px,py] = p.split("_").map(Number);
                rev.push({x:px, y:py});
                p = parent[p];
            }
            rev.reverse();

            pathCells = rev;
            solving = true;

            mapCtx.fillStyle = "lime";
            for (const pt of rev) mapCtx.fillRect(pt.x, pt.y, 1, 1);

            const solveTime = performance.now() - solveStartTime;
            document.getElementById("solveTime").textContent = solveTime.toFixed(2) + " ms";

            return;
        }

        for (const [dx,dy] of dirs) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;

            if (!isFreeCell(nx, ny)) continue;

            const k = key(nx,ny);
            if (!visited.has(k)) {
                visited.add(k);
                parent[k] = key(cur.x,cur.y);
                queue.push({x:nx, y:ny});
            }
        }
    }

    alert("No path found.");
}

// ======================= MAIN LOOP =======================
function animate() {
    ctx.clearRect(0,0,view.width,view.height);

    if (grid) {
        if (solving && pathCells.length > 0) {
            for (let i = 0; i < speedMultiplier && pathCells.length > 0; i++) {
                const next = pathCells.shift();
                robotX = next.x;
                robotY = next.y;
                // here is where you'd send commands to a real robot:
                // robot.moveTo(next.x, next.y);
            }
        } else if (solving && pathCells.length === 0) {
            solving = false;
        }

        ctx.drawImage(mapCanvas, 0, 0, view.width, view.height);

        const scaleX = view.width / mapCanvas.width;
        const scaleY = view.height / mapCanvas.height;

        // robot
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(robotX * scaleX, robotY * scaleY, 5, 0, 2*Math.PI);
        ctx.fill();

        // target
        ctx.fillStyle = "cyan";
        ctx.beginPath();
        ctx.arc(targetX * scaleX, targetY * scaleY, 6, 0, 2*Math.PI);
        ctx.fill();
    }

    requestAnimationFrame(animate);
}

// ======================= GENERATE MAP (ROBOT START + TARGET) =======================
function generateMap() {
    const mw = parseInt(document.getElementById("mw").value);
    const mh = parseInt(document.getElementById("mh").value);

    grid = createMap(mw, mh);
    drawMapToCanvas(grid);

    // robot start: random free cell on top or bottom row
    const chooseTop = Math.random() < 0.5;
    let startX = Math.floor(Math.random() * mw);
    let startY = chooseTop ? 0 : mh - 1;
    const startFree = findNearestFree(grid, startX, startY);
    robotX = startFree.x;
    robotY = startFree.y;

    // default target: nearest free to bottom-right
    const exitFree = findNearestFree(grid, mw - 1, mh - 1);
    targetX = exitFree.x;
    targetY = exitFree.y;

    solving = false;
    pathCells = [];
    document.getElementById("solveTime").textContent = "0 ms";

    view.focus();
}

updateSpeed();
animate();
