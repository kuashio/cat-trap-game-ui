// webview.js: Fixes tile click accuracy and ensures grid state sync
const vscode = acquireVsCodeApi();

const canvas = document.getElementById('hexgrid');

const ctx = canvas.getContext('2d');
const controls = {
    startGame: document.getElementById('startGame'),
    hexSize: document.getElementById('hexSize'),
    deadline: document.getElementById('deadline'),
    randomCat: document.getElementById('randomCat'),
    limitedDepth: document.getElementById('limitedDepth'),
    iterativeDeepening: document.getElementById('iterativeDeepening'),
    depth: document.getElementById('depth'),
    alphaBetaPruning: document.getElementById('alphaBetaPruning'),
    editMode: document.getElementById('editMode'),
};

let grid = [];
const hexRadius = 30; // Fixed tile size
const hexWidth = Math.sqrt(3) * hexRadius;
const hexHeight = 2 * hexRadius;

// Event listeners for controls
controls.startGame.addEventListener('click', () => {
    const gridSize = parseInt(controls.hexSize.value);
    controls.editMode.disabled = false;
    controls.editMode.checked = false;
    vscode.postMessage({ command: 'startGame', size: gridSize });
});

controls.hexSize.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        controls.startGame.click(); // Trigger the Start New Game button click
    }
});


window.addEventListener('message', (event) => {
    const { command, status } = event.data;

    if (command === 'serverStatus') {
        const statusIndicator = document.getElementById('serverStatus');
        if (statusIndicator) {
            if (status === 'connected') {
                statusIndicator.textContent = 'Connected';
                statusIndicator.style.color = 'green';
            } else {
                statusIndicator.textContent = 'Disconnected';
                statusIndicator.style.color = 'red';
            }
        }
    }
});

// Request initial grid when the webview loads
vscode.postMessage({ command: 'getInitialGrid' });
let isWaiting = false; // Local flag in the webview

// Listen for messages from the extension
window.addEventListener('message', (event) => {
    const { command, isWaiting: waitingStatus } = event.data;

    if (command === 'updateWaiting') {
        isWaiting = waitingStatus; // Update the local isWaiting flag
    } 
});

window.addEventListener('message', (event) => {
    const { command, data } = event.data;

    if (command === 'updateGrid') {
        grid = data; // Sync grid state
        renderGrid(grid);
    }
});

function renderGrid(grid) {
    // Set initial canvas size
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const { x, y } = calculateHexPosition(row, col);
            drawHexagon(x, y, hexRadius, grid[row][col]);
        }
    }
    sendGridToExtension();
}

function calculateHexPosition(row, col) {
    const x = col * hexWidth + (row % 2 ? hexWidth / 2 : 0) + hexRadius;
    const y = row * (hexHeight * 0.75) + hexRadius + 5; // Add 5px vertical offset
    return { x, y };
}

function drawHexagon(x, y, radius, state) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i - Math.PI / 6; // Pointy-top hex adjustment
        const vx = x + radius * Math.cos(angle);
        const vy = y + radius * Math.sin(angle);
        ctx.lineTo(vx, vy);
    }
    ctx.closePath();

    // Set outline thickness
    ctx.strokeStyle = "#e0e0e0"; // Light gray outline
    ctx.lineWidth = 3; // Slightly thicker outline
    ctx.stroke();

    // Fill colors based on tile state
    if (state === 6) {
        ctx.fillStyle = "#E8ECF7"; // Background color for cat 
        ctx.fill();
        ctx.font = `${radius * 1.3}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🐈", x, y);
    } else if (state === 1) {
        ctx.fillStyle = "gray"; // Blocked tile
        ctx.fill();
    } else {
        ctx.fillStyle = "#54b9f8"; // Light blue for free tiles
        ctx.fill();
    }
}

let placingCat = false; // Tracks the state for placing the cat

canvas.addEventListener('click', (event) => {
    if (isWaiting) {
        console.warn('Action blocked: Waiting for server response.');
        return; // Prevent further actions if waiting
    }
    const { offsetX, offsetY } = event;
    const tile = getClickedTile(offsetX, offsetY);

    if (!tile || !isValidTile(tile)) return; // Exit early if tile is invalid

    const state = grid[tile.row][tile.col];

    if (controls.editMode.checked) {
        // --- Edit Mode Logic ---
        if (placingCat) {
            // Place the cat and re-enable edit mode checkbox
            vscode.postMessage({ command: 'edit', action: 'place_cat', tile: [tile.row, tile.col], grid: grid });
            controls.editMode.disabled = false;
            placingCat = false;
        } else if (state === 6) {
            // Clicked on the cat -> unblock and disable edit mode temporarily
            vscode.postMessage({ command: 'edit', action: 'unblock', tile: [tile.row, tile.col], grid: grid });
            controls.editMode.disabled = true;
            placingCat = true;
        } else {
            // Block or unblock tile
            const action = state === 1 ? "unblock" : "block";
            vscode.postMessage({ command: 'edit', action, tile: [tile.row, tile.col], grid: grid });
        }
    } else {
        // --- Normal Mode Logic ---
        if (state === 0) { // Only allow moves on empty tiles
            const statusIndicator = document.getElementById('serverStatus');
            if (statusIndicator)
                if (statusIndicator.textContent == 'Connected' && !isWaiting) {
                    grid[tile.row][tile.col] = 1; // Mark the clicked tile as blocked
                    renderGrid(grid); // Re-render the grid immediately
                }
            vscode.postMessage({
                command: 'move',
                clickedTile: [tile.row, tile.col],
                deadline: parseFloat(controls.deadline.value),
                strategy: document.querySelector('input[name="strategy"]:checked').value,
                depth: parseInt(controls.depth.value),
                alphaBetaPruning: controls.alphaBetaPruning.checked,
                grid: grid // Include the entire grid in the message
            });
        }
    }
});

function sendGridToExtension() {
    vscode.postMessage({ command: 'sendGrid', grid });
}


function getClickedTile(x, y) {
    // Convert click position back to grid coordinates
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const { x: hx, y: hy } = calculateHexPosition(row, col);
            const distance = Math.sqrt((x - hx) ** 2 + (y - hy) ** 2);
            if (distance < hexRadius * 0.95) {
                return { row, col };
            }
        }
    }
    return null; // No valid tile found
}

function isValidTile(tile) {
    return tile.row >= 0 && tile.row < grid.length && tile.col >= 0 && tile.col < grid[tile.row].length;
}

// Listen for endgame message from extension
window.addEventListener('message', (event) => {
    const { command, message } = event.data;

    if (command === 'showEndgameMessage') {
        showEndgameDialog(message);
    }
});

function showEndgameDialog(message) {
    // Create dialog elements
    const dialog = document.createElement('div');
    const overlay = document.createElement('div');
    const messageBox = document.createElement('div');
    const okButton = document.createElement('button');

    // Style overlay (background)
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = 1000;

    // Style dialog box
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.backgroundColor = 'white';
    dialog.style.padding = '20px';
    dialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    dialog.style.zIndex = 1001;
    dialog.style.textAlign = 'center';

    // Style message box
    messageBox.textContent = message;
    messageBox.style.marginBottom = '20px';
    messageBox.style.fontSize = '18px';
    messageBox.style.color = '#505050'; // Set constant font color

    // Style OK button
    okButton.textContent = 'OK';
    okButton.style.padding = '10px 20px';
    okButton.style.fontSize = '16px';
    okButton.style.cursor = 'pointer';
    okButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    });

    // Assemble dialog
    dialog.appendChild(messageBox);
    dialog.appendChild(okButton);
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
}

window.addEventListener('message', (event) => {
    const { command, theme } = event.data;

    if (command === 'updateTheme') {
        document.documentElement.style.setProperty('--theme-background', theme.background);
        document.documentElement.style.setProperty('--theme-foreground', theme.foreground);
        renderGrid(grid); // Re-render the grid to apply the new styles
    }
});

window.addEventListener('resize', () => {
    // Re-render grid on window resize
    canvas.width = canvas.parentElement.clientWidth - 40;
    canvas.height = 15 * hexHeight;
    renderGrid(grid);
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        renderGrid(grid); // Re-render the grid when the webview becomes visible
    }
});


// Set initial canvas size
canvas.width = canvas.parentElement.clientWidth;
canvas.height = canvas.parentElement.clientHeight;
