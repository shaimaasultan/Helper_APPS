// ======================= MAZE GENERATOR =======================
function createMaze(w, h) {
    if (w < 3) w = 3;
    if (h < 3) h = 3;

    const maze = [];
    for (let y = 0; y < h; y++) {
        maze[y] = [];
        for (let x = 0; x < w; x++) maze[y][x] = 1;
    }

    const W = (w % 2 === 0) ? w - 1 : w;
    const H = (h % 2 === 0) ? h - 1 : h;

    let sx = 1, sy = 1;
    maze[sy][sx] = 0;

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

            if (nx > 0 && nx < W && ny > 0 && ny < H && maze[ny][nx] === 1) {
                maze[cell.y + d.dy/2][cell.x + d.dx/2] = 0;
                maze[ny][nx] = 0;
                stack.push({x:nx, y:ny});
                carved = true;
                break;
            }
        }

        if (!carved) stack.pop();
    }

    return maze;
}

// ======================= FIND NEAREST FREE PIXEL =======================
function findNearestFree(maze, sx, sy) {
    const h = maze.length;
    const w = maze[0].length;
    const q = [{x:sx, y:sy}];
    const seen = new Set([sx + "_" + sy]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    while (q.length) {
        const {x,y} = q.shift();
        if (x>=0 && x<w && y>=0 && y<h && maze[y][x] === 0) return {x,y};
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
let maze = null;
let mazeCanvas = document.createElement("canvas");
let mazeCtx = mazeCanvas.getContext("2d");

const view = document.getElementById("view");
const ctx = view.getContext("2d");
view.focus();

let playerX = 1;
let playerY = 1;

let speedMultiplier = 5;
let baseSpeed = 0.2;

let joyX = 0, joyY = 0;

let exitX = 0, exitY = 0;

let solving = false;
let pixelPath = [];

let solveStartTime = 0;

// ======================= SPEED SLIDER =======================
function updateSpeed() {
    speedMultiplier = parseInt(document.getElementById("speedSlider").value);
    document.getElementById("speedValue").textContent = speedMultiplier;
}

// ======================= KEYBOARD INPUT =======================
view.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft"  || e.key === "a") joyX = -1;
    if (e.key === "ArrowRight" || e.key === "d") joyX =  1;
    if (e.key === "ArrowUp"    || e.key === "w") joyY = -1;
    if (e.key === "ArrowDown"  || e.key === "s") joyY =  1;
});
view.addEventListener("keyup", e => {
    if (["ArrowLeft","a","ArrowRight","d"].includes(e.key)) joyX = 0;
    if (["ArrowUp","w","ArrowDown","s"].includes(e.key))    joyY = 0;
});

// ======================= COLLISION =======================
function isFreePixel(x, y) {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (!maze || py < 0 || py >= maze.length || px < 0 || px >= maze[0].length) return false;
    return maze[py][px] === 0;
}

// ======================= DRAW MAZE =======================
function drawMazeToCanvas(maze) {
    const rows = maze.length;
    const cols = maze[0].length;
    mazeCanvas.width = cols;
    mazeCanvas.height = rows;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            mazeCtx.fillStyle = maze[y][x] === 1 ? "black" : "white";
            mazeCtx.fillRect(x, y, 1, 1);
        }
    }
}

// ======================= SOLVER (BFS) =======================
function solveImageMaze() {
    if (!maze) return;

    solveStartTime = performance.now();

    const start = {
        x: Math.floor(playerX),
        y: Math.floor(playerY)
    };

    if (!isFreePixel(start.x, start.y)) {
        alert("Start point is inside a wall. Move to a white pixel first.");
        return;
    }

    const goal = { x: exitX, y: exitY };

    if (!isFreePixel(goal.x, goal.y)) {
        alert("Exit point is inside a wall. Regenerate maze.");
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

            pixelPath = rev;
            solving = true;

            mazeCtx.fillStyle = "lime";
            for (const pt of rev) mazeCtx.fillRect(pt.x, pt.y, 1, 1);

            const solveTime = performance.now() - solveStartTime;
            document.getElementById("solveTime").textContent = solveTime.toFixed(2) + " ms";

            return;
        }

        for (const [dx,dy] of dirs) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;

            if (!isFreePixel(nx, ny)) continue;

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

    if (maze) {
        if (solving && pixelPath.length > 0) {
            for (let i = 0; i < speedMultiplier && pixelPath.length > 0; i++) {
                const next = pixelPath.shift();
                playerX = next.x;
                playerY = next.y;
            }
        } else if (solving && pixelPath.length === 0) {
            solving = false;
        } else {
            let newX = playerX + joyX * baseSpeed * speedMultiplier;
            let newY = playerY + joyY * baseSpeed * speedMultiplier;
            if (isFreePixel(newX, newY)) {
                playerX = newX;
                playerY = newY;
            }
        }

        ctx.drawImage(mazeCanvas, 0, 0, view.width, view.height);

        const scaleX = view.width / mazeCanvas.width;
        const scaleY = view.height / mazeCanvas.height;

        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(playerX * scaleX, playerY * scaleY, 5, 0, 2*Math.PI);
        ctx.fill();

        ctx.fillStyle = "cyan";
        ctx.beginPath();
        ctx.arc(exitX * scaleX, exitY * scaleY, 6, 0, 2*Math.PI);
        ctx.fill();
    }

    requestAnimationFrame(animate);
}

// ======================= GENERATE MAZE (START RESET + SNAP + TOP/BOTTOM LOGIC) =======================
function generateMaze() {
    const mw = parseInt(document.getElementById("mw").value);
    const mh = parseInt(document.getElementById("mh").value);

    maze = createMaze(mw, mh);
    drawMazeToCanvas(maze);

    // --- NEW START LOGIC ---
    const chooseTop = Math.random() < 0.5;
    let startX = Math.floor(Math.random() * mw);
    let startY = chooseTop ? 0 : mh - 1;

    const startFree = findNearestFree(maze, startX, startY);
    playerX = startFree.x;
    playerY = startFree.y;

    // --- EXIT LOGIC ---
    const exitFree = findNearestFree(maze, mw - 1, mh - 1);
    exitX = exitFree.x;
    exitY = exitFree.y;

    solving = false;
    pixelPath = [];
    document.getElementById("solveTime").textContent = "0 ms";

    view.focus();
}

updateSpeed();
animate();
