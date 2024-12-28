// extension.ts: Updated logic to incorporate new layout, controls, and communication
import * as vscode from 'vscode';
import WebSocket from 'ws'; 

let isWaiting = false; // Flag to track if waiting for the server's response
let currentGrid: number[][] | null = null; // Store the grid sent from the webview

export function activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('cat-trap-game-ui.start', () => {
            const panel = vscode.window.createWebviewPanel(
                'catTrapGame',
                'Cat Trap Game',
                vscode.ViewColumn.One,
                { enableScripts: true, retainContextWhenHidden: true }
            );
            panel.onDidDispose(() => {
                console.log("WebView closed. Resetting state.");
                isWaiting = false;

            }, null, context.subscriptions);
            
            panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

            let socket: WebSocket | null = null;
            function connectWebSocket() {
                socket = new WebSocket('ws://localhost:8765');
            
                socket.onopen = () => {
                    console.log('WebSocket connection established');
                    isWaiting = false; // Reset the waiting flag
                    panel.webview.postMessage({ command: 'serverStatus', status: 'connected' });
            
                    // Request grid from the server
                    if (socket) {
                        socket.send(JSON.stringify({ command: 'request_grid', grid: currentGrid || [] })); 
                    }
                };
            
                socket.onclose = () => {
                    console.log('WebSocket connection closed. Reconnecting in 2 seconds...');
                    panel.webview.postMessage({ command: 'serverStatus', status: 'disconnected' });
                    setTimeout(connectWebSocket, 2000); // Retry connection
                };
            
                socket.onerror = (error) => {
                    console.error('WebSocket error:', error);                
                };
            
                socket.onmessage = (event: WebSocket.MessageEvent) => {
                    console.log('Message received from server:', event.data);
                    const data = JSON.parse(event.data.toString());
                    if (data.command === 'updateGrid') {
                        // Use the grid provided by the server
                        isWaiting = false; // Clear the waiting flag
                        panel.webview.postMessage({ command: 'updateWaiting', isWaiting: false }); // Notify webview
                        panel.webview.postMessage({ command: 'updateGrid', data: JSON.parse(data.data) });
                    } else if (data.command === 'endgame') {
                        const reason = data.reason;
                        const message =
                            reason === 2 ? 'The Cat Escaped! You Lose!' :
                            reason === 1 ? 'The Cat is Trapped! You Win!' :
                            'Time is Up for the Cat! You Win!';
                        panel.webview.postMessage({ command: 'showEndgameMessage', message });
                    }
                };
            }
            
            const initialGameState = initializeLocalGame(7);
            panel.webview.postMessage({ command: 'updateGrid', data: initialGameState.hexgrid });

            // Initialize WebSocket connection and start the game
            connectWebSocket(); // Initiate connection

            panel.webview.onDidReceiveMessage(
                (message) => {
                    if (message.command === 'sendGrid') {
                        currentGrid = message.grid; // Update the local grid
                        console.log('Grid received from webview:', currentGrid);
                    } else if (socket && socket.readyState === WebSocket.OPEN) {
                        if (message.command === 'startGame') {
                            socket.send(JSON.stringify({ command: 'new_game', size: message.size }));
                        } else if (message.command === 'move') {
                            if (!isWaiting) { // Only send if not already waiting
                                isWaiting = true; // Set the waiting flag
                                panel.webview.postMessage({ command: 'updateWaiting', isWaiting: true }); // Notify webview
                                socket.send(JSON.stringify({
                                    command: 'move',
                                    clicked_tile: message.clickedTile,
                                    deadline: message.deadline,
                                    strategy: message.strategy,
                                    depth: message.depth,
                                    alpha_beta_pruning: message.alphaBetaPruning,
                                    grid: message.grid // Add the current grid to the message
                                }));
                            } else {
                                console.warn('Waiting for server response. Move not sent.');
                            }
                        } else if (message.command === 'edit') {
                            if (!isWaiting) { // Only send if not already waiting
                                socket.send(JSON.stringify({
                                    command: 'edit',
                                    action: message.action,
                                    tile: message.tile,
                                    grid: message.grid // Add the current grid to the message
                                }));
                            } else {
                                console.warn('Waiting for server response. Edit not sent.');
                            }
                        }
                    } else {
                        console.warn('WebSocket not connected. Ignoring message:', message);
                    }
                },
                undefined,
                context.subscriptions
            );
        })
    );
}



// Function to initialize the game locally
function initializeLocalGame(size: number): { hexgrid: number[][] } {
    const EMPTY_TILE = 0;
    const BLOCK_TILE = 1;
    const CAT_TILE = 6;

    const hexgrid = Array.from({ length: size }, () => Array(size).fill(EMPTY_TILE));
    hexgrid[Math.floor(size / 2)][Math.floor(size / 2)] = CAT_TILE;

    const numBlocks = Math.floor(Math.random() * (0.13 * size * size - 0.067 * size * size) + 0.067 * size * size);
    let count = 0;

    while (count < numBlocks) {
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);
        if (hexgrid[r][c] === EMPTY_TILE) {
            hexgrid[r][c] = BLOCK_TILE;
            count++;
        }
    }
    return { hexgrid };
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.css'));

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${styleUri}">
        <title>Cat Trap Game</title>
    </head>
    <body>
        <!-- Final layout structure -->
        <div id="serverStatus" style="padding: 5px; font-size: 12px; color: green;">Connected</div>

        <div id="controls">
            <div id="top-row">
                <div id="top-left" class="pane">
                    <button id="startGame" title="Start a new game with the current settings">Start New Game</button>
                    <label for="hexSize">Hexgrid Size: <input type="number" id="hexSize" min="1" max="999" value="7" title="Enter the number of rows and columns in the hexgrid. An odd number is recommended."></label>
                </div>
                <div id="top-right" class="pane">
                    <label title="Enable Edit Mode to block/unblock tiles or move the cat"><input type="checkbox" id="editMode"> Edit Mode</label>
                </div>
            </div>

            <div id="bottom-row">
                <div id="bottom-left" class="pane">
                    <fieldset>
                        <legend>Cat Movement Strategies</legend>
                        <label title="The cat will move randomly"><input type="radio" name="strategy" id="randomCat" value="random"> Random Cat</label>
                        <label title="Use the Minimax algorithm to decide the cat's moves"><input type="radio" name="strategy" id="minimax" value="minimax"> Minimax</label>
                        <label title="Limit the cat's search depth to the specified number">
                            <input type="radio" name="strategy" id="limitedDepth" value="limited"> Limited Depth: <input type="number" id="depth" min="1" max="999" style="width: 3em;" value="4" title="Set the depth limit for the cat's search">
                        </label>
                        <label title="Use iterative deepening to optimize the cat's moves"><input type="radio" name="strategy" id="iterativeDeepening" value="iterative" checked > Iterative Deepening</label>
                    </fieldset>
                </div>
                <div id="bottom-right" class="pane">
                    <label for="deadline" title="Set the maximum time (in seconds) allowed for the cat to decide its move">Deadline in seconds: <input type="number" id="deadline" min="0.0" step="0.5" style="width: 4em;" value="5.0"></label>
                    <br>
                    <label title="Enable alpha-beta pruning to improve the efficiency of the cat's decision-making"><input type="checkbox" id="alphaBetaPruning" checked> Alpha-Beta Pruning</label>
                </div>
            </div>
        </div>

        <style>
        /* Ensure all controls align properly with inline inputs and checkboxes */
        #controls {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 10px;
            align-items: flex-start; /* Align everything to the top-left */
        }

        #top-row, #bottom-row {
            display: flex;
            justify-content: flex-start;
            gap: 20px;
        }

        .pane {
            display: flex;
            flex-direction: column;
            gap: 5px;
            align-items: flex-start;
        }

        fieldset {
            border: 1px solid #ccc;
            padding: 10px;
            margin: 0;
        }

        label {
            display: flex;
            align-items: center;
            gap: 5px; /* Add spacing between label text and input */
            margin-bottom: 3px; /* Reduce vertical spacing between radio buttons */
        }

        input[type="number"], input[type="checkbox"] {
            margin: 0;
        }

        input[type="number"] {
            width: 3em;
        }
        </style>
        <canvas id="hexgrid"></canvas>
        <script src="${scriptUri}"></script>
    </body>
    </html>`;
}

export function deactivate(): void {
    // No cleanup necessary
}
