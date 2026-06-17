let allMValues = [3, 5, 7, 11];
let branchLength = 3;

// -----------------------------
// Utility: color by last digit
// -----------------------------
function colorForLastDigit(n) {
    const last = n % 10;
    if (last === 1) return "gold";
    if (last === 3) return "red";
    if (last === 5) return "green";
    if (last === 7) return "blue";
    if (last === 9) return "purple";
    return "gray";
}

// -----------------------------
// Collatz helpers
// -----------------------------
// function oddParentsWithK(n) {
//     let parents = [];
//     let k = 1;
//     while (true) {
//         let N = n * (2 ** k);
//         if ((N - 1) % 3 === 0) {
//             let o = (N - 1) / 3;
//             if (o % 2 === 1) parents.push({ parent: o, k: k });
//         }
//         if (N > 1e12) break;
//         k++;
//     }
//     return parents;
// }


function oddParentsWithK(n, mList) {
    const toggle = document.getElementById("toggleFullFamily");
    const useFullMode = toggle ? toggle.checked : false;

    let parents = [];
    let k = 1;

    while (true) {
        let N = n * (2 ** k);

        if ((N - 1) % 3 === 0) {
            let o = (N - 1) / 3;
            if (o % 2 === 1) {
                parents.push({ parent: o, k: k });

                 // ⭐ Mode A: stop ONLY if parent is NOT in m-values
                if (!useFullMode && !mList.includes(o)) break;
            }
        }

        if (N > 1e12) break;
        k++;
    }

    return parents;
}

function firstK(m) {
    if (m % 3 === 1) return 2;
    if (m % 3 === 2) return 1;
    return null;
}

function firstParent(m) {
    const k0 = firstK(m);
    if (k0 === null) return null;
    return (m * (2 ** k0) - 1) / 3;
}

function branchOfM(m, length) {
    const o0 = firstParent(m);
    if (o0 === null) return [];
    const branch = [o0];
    for (let i = 1; i < length; i++) {
        branch.push(4 * branch[branch.length - 1] + 1);
    }
    return branch;
}

function getLinkedFamilies(nodeId) {
    const families = new Set();

    const nodesData = network.body.data.nodes;
    const node = nodesData.get(nodeId);

    if (node && node.families) {
        node.families.forEach(f => families.add(f));
    }

    const connected = network.getConnectedNodes(nodeId);

    connected.forEach(id => {
        const nd = nodesData.get(id);
        if (nd && nd.families) {
            nd.families.forEach(f => families.add(f));
        }
    });

    return Array.from(families).sort((a, b) => a - b);
}

function getLinkedFamilies(nodeId) {
    const families = new Set();
    const visited = new Set();
    const queue = [nodeId];
    const nodesData = network.body.data.nodes;

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        visited.add(current);

        // Find node in your array
        const node = nodesData.get(current);
        if (node && node.families) {
            node.families.forEach(f => families.add(f));
        }

        // Explore neighbors
        const neighbors = network.getConnectedNodes(current);
        neighbors.forEach(nb => {
            if (!visited.has(nb)) queue.push(nb);
        });
    }

    return Array.from(families).sort((a, b) => a - b);
}



// -----------------------------
// Build graph
// -----------------------------
function buildGraph(mList) {
    let nodes = [];
    let edges = [];
    let nodeSet = new Set();

    function addNode(n, currentM) {
        if (!nodeSet.has(n)) {
            nodeSet.add(n);

            const baseColor = colorForLastDigit(n);

            nodes.push({
                id: n,
                label: String(n),
                families: [currentM],   // store as array
                color: { background: baseColor, border: "#333" },
                baseColor: baseColor
            });

        } else {
            // Node already exists → append family if not already included
            const existing = nodes.find(node => node.id === n);

            if (!existing.families.includes(currentM)) {
                existing.families.push(currentM);   // <-- FIXED
            }
        }
    }


    for (let m of mList) {
        addNode(m,m);
        const parents = oddParentsWithK(m,mList);
        for (let entry of parents) {
            addNode(entry.parent,m);
            edges.push({
                from: entry.parent,
                to: m,
                label: "k=" + entry.k,
                arrows: "to",
                font: { align: "middle" }
            });
        }
        
    }

    

    return { nodes, edges };
}

function showNodeInfo(n) {
    const panel = document.getElementById("infoContent");

    // Compute 3n+1
    const expr = 3 * n + 1;

    // Factor out powers of 2 step-by-step
    let x = expr;
    let v2 = 0;
    const steps = [];
    steps.push(`Start with 3n + 1 = ${expr}`);

    while (x % 2 === 0) {
        steps.push(`${x} is even → divide by 2 → ${x / 2}`);
        x /= 2;
        v2++;
    }

    const m = x; // odd child

    // Get linked families
    const linkedFamilies = getLinkedFamilies(n);

    // Build HTML for text steps
    const stepsHtml = steps.map(s => "• " + s).join("<br>");

    // Build math-notation steps
    const mathSteps = [];
    mathSteps.push(`3n + 1 = ${expr}`);
    mathSteps.push(`${expr} = 2 · ${expr / 2}`);

    let temp = expr / 2;
    for (let i = 1; i < v2; i++) {
        mathSteps.push(`${temp} = 2 · ${temp / 2}`);
        temp /= 2;
    }

    mathSteps.push(`Final odd term m = ${m}`);
    mathSteps.push(`${expr} = ${m} · 2^${v2}`);

    const mathHtml = mathSteps.map(s => "• " + s).join("<br>");

    // Build text for copy button
    window._lastExplanationText =
`Number n = ${n}
3n + 1 = ${expr}
v2(3n+1) = ${v2}
Odd child m = ${m}
Linked Families = { ${linkedFamilies.join(", ")} }

Step-by-step factorization:
${steps.join("\n")}

Math notation:
${mathSteps.join("\n")}`;

    // Fill info panel (buttons are separate)
    panel.innerHTML = `
        <strong>Number n:</strong> ${n}<br><br>

        <strong>3n + 1:</strong> ${expr}<br>
        <strong>v₂(3n+1):</strong> ${v2}<br>
        <strong>Odd child m:</strong> ${m}<br>

        <strong>Linked Families:</strong> { ${linkedFamilies.join(", ")} }<br><br>

        <em>Meaning of v₂(3n+1) = ${v2}:</em><br>
        (3n + 1) = m · 2<sup>${v2}</sup><br>
        (3n + 1) / (m · 2<sup>${v2}</sup>) = 1<br><br>

        <em>Step‑by‑step factorization:</em>
        <div id="factorizationBlock" style="margin-top:6px; display:none;">
            ${stepsHtml}<br><br>
            Final result:<br>
            <strong>${expr} = ${m} · 2<sup>${v2}</sup></strong>
        </div>

        <em>Math notation:</em>
        <div id="mathBlock" style="margin-top:6px; display:none;">
            ${mathHtml}<br><br>
            Final result:<br>
            <strong>${expr} = ${m} · 2<sup>${v2}</sup></strong>
        </div>
    `;
}






// -----------------------------
// Toggle explanation visibility
// -----------------------------
document.getElementById("toggleExplanationBtn").addEventListener("click", function () {
    const block = document.getElementById("factorizationBlock");

    if (!block) return;

    if (block.style.display === "none") {
        block.style.display = "block";
        this.textContent = "Hide Steps";
    } else {
        block.style.display = "none";
        this.textContent = "Show Steps";
    }
});



// -----------------------------
// Copy explanation to clipboard
// -----------------------------
document.getElementById("copyExplanationBtn").addEventListener("click", function () {
    if (window._lastExplanationText) {
        navigator.clipboard.writeText(window._lastExplanationText);
        this.textContent = "Copied!";
        setTimeout(() => this.textContent = "Copy Explanation", 1200);
    }
});

document.getElementById("toggleMathBtn").addEventListener("click", function () {
    const block = document.getElementById("mathBlock");
    const textBlock = document.getElementById("factorizationBlock");

    if (!block) return;

    // Hide text steps if math steps are shown
    textBlock.style.display = "none";
    document.getElementById("toggleExplanationBtn").textContent = "Show Steps";

    if (block.style.display === "none") {
        block.style.display = "block";
        this.textContent = "Hide Math";
    } else {
        block.style.display = "none";
        this.textContent = "Show Steps (Math)";
    }
});



// -----------------------------
// Graph rendering
// -----------------------------
let network = null;
let graphData = null;

function renderGraph(mList) {
    graphData = buildGraph(mList);
    const container = document.getElementById("mynetwork");
    const data = {
        nodes: new vis.DataSet(graphData.nodes),
        edges: new vis.DataSet(graphData.edges)
    };
    const options = {
        layout: { improvedLayout: true },
        physics: {
            enabled: true,
            barnesHut: {
                gravitationalConstant: -30000,
                springLength: 200
            }
        },
        edges: { smooth: true }
    };
    network = new vis.Network(container, data, options);

    network.on("click", function (params) {
        const panel = document.getElementById("infoContent");

        if (params.nodes && params.nodes.length > 0) {
            const nodeId = params.nodes[0];

            // highlight branch
            highlightBranch(nodeId);

            // show info
            showNodeInfo(nodeId);

            return;
        }

        // clicked empty space
        resetHighlight();
        panel.textContent = "Click a node to see details";
    });


}

// -----------------------------
// Highlight branch
// -----------------------------
function buildAdjacency() {
    const adj = {};
    const rev = {};
    for (let e of graphData.edges) {
        if (!adj[e.from]) adj[e.from] = [];
        if (!rev[e.to]) rev[e.to] = [];
        adj[e.from].push(e.to);
        rev[e.to].push(e.from);
    }
    return { adj, rev };
}

function highlightBranch(startId) {
    const { adj, rev } = buildAdjacency();
    const visited = new Set();
    const stack = [startId];

    while (stack.length > 0) {
        const u = stack.pop();
        if (visited.has(u)) continue;
        visited.add(u);
        if (adj[u]) for (let v of adj[u]) stack.push(v);
        if (rev[u]) for (let v of rev[u]) stack.push(v);
    }

    const nodesDS = network.body.data.nodes;
    nodesDS.forEach((node) => {
        const inBranch = visited.has(node.id);
        const base = node.baseColor;
        nodesDS.update({
            id: node.id,
            color: {
                background: base,
                border: inBranch ? "yellow" : "#333"
            },
            borderWidth: inBranch ? 4 : 1
        });
    });
}

function resetHighlight() {
    const nodesDS = network.body.data.nodes;
    nodesDS.forEach((node) => {
        const base = node.baseColor;
        nodesDS.update({
            id: node.id,
            color: { background: base, border: "#333" },
            borderWidth: 1
        });
    });
}

// -----------------------------
// Export graph as PNG
// -----------------------------
document.getElementById("exportBtn").addEventListener("click", function () {
    const canvas = network.canvas.frame.canvas;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "collatz_graph.png";
    link.click();
});

// -----------------------------
// Dynamic spiral
// -----------------------------
function drawSpiral(mList) {
    const canvas = document.getElementById("spiralCanvas");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) / 4;

    const offsets = {};
    mList.forEach((m, i) => {
        offsets[m] = (2 * Math.PI * i) / mList.length;
    });

    for (let m of mList) {
        const branch = branchOfM(m, branchLength);
        ctx.fillStyle = colorForLastDigit(m);

        for (let n of branch) {
            const r = Math.log(n);
            const theta = r + offsets[m];
            const x = cx + scale * (r / 10) * Math.cos(theta);
            const y = cy + scale * (r / 10) * Math.sin(theta);
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

// -----------------------------
// Generate checkboxes dynamically
// -----------------------------
function rebuildCheckboxes() {
    const container = document.getElementById("familyToggles");
    container.innerHTML = "<strong>Show families:</strong> ";

    allMValues.forEach(m => {
        const id = "chk_" + m;
        container.innerHTML += `
            <label>
                <input type="checkbox" class="m-toggle" id="${id}" value="${m}" checked>
                m = ${m}
            </label>
        `;
    });

    document.querySelectorAll(".m-toggle").forEach(c =>
        c.addEventListener("change", updateAll)
    );
}

// -----------------------------
// Apply button
// -----------------------------
document.getElementById("applyBtn").addEventListener("click", function () {
    const mText = document.getElementById("mInput").value;
    allMValues = mText.split(",").map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));

    branchLength = parseInt(document.getElementById("branchInput").value, 10);
    if (isNaN(branchLength) || branchLength < 10) branchLength = 200;

    rebuildCheckboxes();
    updateAll();
});

// -----------------------------
// Initialization
// -----------------------------
function getSelectedMValues() {
    const checks = document.querySelectorAll(".m-toggle");
    const res = [];
    checks.forEach((c) => {
        if (c.checked) res.push(parseInt(c.value, 10));
    });
    return res;
}

function updateAll() {
    const mList = getSelectedMValues();
    renderGraph(mList);
    drawSpiral(mList);
}

// -----------------------------
// Search for a number
// -----------------------------
function collatzChild(n) {
    let x = 3 * n + 1;
    while (x % 2 === 0) x /= 2;
    return x; // this is the odd child m
}

document.getElementById("searchBtn").addEventListener("click", function () {
    const msg = document.getElementById("searchMsg");
    msg.textContent = "";

    const value = parseInt(document.getElementById("searchInput").value, 10);
    if (isNaN(value)) {
        msg.textContent = "Enter a valid number";
        return;
    }

    const nodesDS = network.body.data.nodes;
    const allNodes = nodesDS.getIds();

    if (allNodes.includes(value)) {
        // Found → highlight branch
        highlightBranch(value);
        msg.style.color = "green";
        msg.textContent = "Found! Highlighted branch.";
        return;
    }

    // Not found → compute missing family
    const m = collatzChild(value);

    msg.style.color = "red";
    msg.textContent =
        `Not found. This number belongs to family m = ${m}. Add it to your list.`;
});

// -----------------------------
// Toggle spiral panel visibility
// -----------------------------
document.getElementById("toggleSpiral").addEventListener("change", function () {
    const spiral = document.getElementById("spiral");
    const graph = document.getElementById("mynetwork");

    if (this.checked) {
        // Show spiral
        spiral.classList.remove("hidden");
        graph.classList.remove("fullWidth");

        // Force redraw AFTER panel becomes visible
        setTimeout(() => {
            drawSpiral(getSelectedMValues());
        }, 50);

    } else {
        // Hide spiral and expand graph
        spiral.classList.add("hidden");
        graph.classList.add("fullWidth");
    }
});

// ABOUT POPUP LOGIC
const aboutLink = document.getElementById("aboutLink");
const aboutPopup = document.getElementById("aboutPopup");
const closeAboutBtn = document.getElementById("closeAboutBtn");

aboutLink.addEventListener("click", () => {
    aboutPopup.classList.remove("hidden");
});

closeAboutBtn.addEventListener("click", () => {
    aboutPopup.classList.add("hidden");
});

// Close popup when clicking outside the box
aboutPopup.addEventListener("click", (e) => {
    if (e.target === aboutPopup) {
        aboutPopup.classList.add("hidden");
    }
});

makePanelDraggable(document.getElementById("infoPanel"));

function makePanelDraggable(panel) {
    const header = panel.querySelector("h3"); // drag handle
    let offsetX = 0, offsetY = 0;
    let isDown = false;

    header.addEventListener("mousedown", (e) => {
        isDown = true;
        offsetX = e.clientX - panel.offsetLeft;
        offsetY = e.clientY - panel.offsetTop;
        panel.style.transition = "none"; // disable animation while dragging
    });

    document.addEventListener("mouseup", () => {
        isDown = false;
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDown) return;

        panel.style.left = (e.clientX - offsetX) + "px";
        panel.style.top = (e.clientY - offsetY) + "px";
        panel.style.right = "auto";  // prevent snapping back
        panel.style.bottom = "auto";
        panel.style.position = "fixed";
    });
}

document.getElementById("toggleFullFamily").addEventListener("change", () => {
    updateAll();  // whatever function you use to rebuild
});


window.addEventListener("load", function () {
    rebuildCheckboxes();
    updateAll();
    document.getElementById("graphTitle").textContent =
    "Inverse Collatz Graph for m = [" + allMValues.join(", ") + ",...]";

    window.addEventListener("resize", () => drawSpiral(getSelectedMValues()));
});
