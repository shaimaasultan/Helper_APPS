const imgInput = document.getElementById("imgInput");
const thresholdSlider = document.getElementById("threshold");
const thVal = document.getElementById("thVal");

const srcCanvas = document.getElementById("srcCanvas");
const mazeCanvas = document.getElementById("mazeCanvas");

const srcCtx = srcCanvas.getContext("2d");
const mazeCtx = mazeCanvas.getContext("2d");

let loadedImage = null;

// Update threshold display
thresholdSlider.oninput = () => {
    thVal.textContent = thresholdSlider.value;
};

// Load image
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

// ------------------------------
// DOOR ARC REMOVAL FILTER
// ------------------------------
function removeDoorArcs(maze) {
    const h = maze.length;
    const w = maze[0].length;

    const cleaned = maze.map(row => row.slice());

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {

            if (maze[y][x] !== 1) continue; // only black pixels

            // Count black neighbors
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (maze[y + dy][x + dx] === 1) count++;
                }
            }

            // Door arcs are thin → few neighbors (2–4)
            // Walls are thick → many neighbors (5–8)
            if (count >= 2 && count <= 4) {
                cleaned[y][x] = 0; // remove arc
            }
        }
    }

    return cleaned;
}

// ------------------------------
// SEMANTIC CLASSIFICATION
// ------------------------------
function classifyBlueprintObjects(maze) {
    const h = maze.length;
    const w = maze[0].length;

    const semantic = [];
    for (let y = 0; y < h; y++) {
        semantic[y] = [];
        for (let x = 0; x < w; x++) {
            semantic[y][x] = { r: 255, g: 255, b: 255, type: 0 }; // free
        }
    }

    function blackNeighbors(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (maze[y + dy] && maze[y + dy][x + dx] === 1) count++;
            }
        }
        return count;
    }

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {

            if (maze[y][x] === 1) {
                const neighbors = blackNeighbors(x, y);

                // WALL (thick)
                if (neighbors >= 5) {
                    semantic[y][x] = { r: 0, g: 0, b: 0, type: 1 };
                    continue;
                }

                // OPEN DOOR (thin arc removed earlier)
                if (neighbors >= 2 && neighbors <= 4) {
                    semantic[y][x] = { r: 0, g: 255, b: 0, type: 2 };
                    continue;
                }

                // WINDOW (thin straight line)
                const left = maze[y][x - 1] === 1;
                const right = maze[y][x + 1] === 1;
                const up = maze[y - 1][x] === 1;
                const down = maze[y + 1][x] === 1;

                const horizontalLine = left && right && !up && !down;
                const verticalLine = up && down && !left && !right;

                if (horizontalLine || verticalLine) {
                    semantic[y][x] = { r: 0, g: 0, b: 255, type: 4 };
                    continue;
                }

                // CLOSED DOOR (solid block)
                semantic[y][x] = { r: 255, g: 0, b: 0, type: 3 };
            }
        }
    }

    return semantic;
}

// ------------------------------
// MAIN CONVERSION
// ------------------------------
function convertImage() {
    if (!loadedImage) {
        alert("Load an image first.");
        return;
    }

    const w = loadedImage.width;
    const h = loadedImage.height;

    mazeCanvas.width = w;
    mazeCanvas.height = h;

    const imgData = srcCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const threshold = parseInt(thresholdSlider.value);

    // Create binary maze grid
    let maze = new Array(h);
    for (let y = 0; y < h; y++) {
        maze[y] = new Array(w);
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const brightness = (r + g + b) / 3;

            maze[y][x] = brightness > threshold ? 0 : 1;
        }
    }

    // Remove door arcs
    maze = removeDoorArcs(maze);

    // Semantic classification
    const semantic = classifyBlueprintObjects(maze);

    // Draw semantic map
    mazeCtx.clearRect(0, 0, w, h);

    const out = mazeCtx.createImageData(w, h);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const p = semantic[y][x];

            out.data[idx] = p.r;
            out.data[idx + 1] = p.g;
            out.data[idx + 2] = p.b;
            out.data[idx + 3] = 255;
        }
    }

    mazeCtx.putImageData(out, 0, 0);

    // Export both maps
    window.robotMazeGrid = maze;
    window.semanticMap = semantic;

    console.log("Binary maze grid:", maze);
    console.log("Semantic map:", semantic);

    alert("Semantic map created with walls, doors, and windows!");
}
