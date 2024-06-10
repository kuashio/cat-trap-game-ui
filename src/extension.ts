import * as vscode from 'vscode';
import WebSocket from 'ws';

let ws: WebSocket | undefined;

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('cat-trap-game-ui.start', () => {
        const panel = vscode.window.createWebviewPanel(
            'hexgrid',
            'Hexgrid',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        panel.webview.html = getWebviewContent();

        // Set up WebSocket communication
        ws = new WebSocket('ws://localhost:8765');
        
        if (ws) {
            ws.onmessage = function (event: WebSocket.MessageEvent) {
                const message = JSON.parse(event.data as string);
                if (message.command === 'updateGrid') {
                    panel.webview.postMessage({ command: 'updateGrid', data: message.data });
                } else if (message.command === 'gameStatus') {
                    vscode.window.showInformationMessage(message.status);
                }
            };
        }

        panel.webview.onDidReceiveMessage(
            (message: { command: string, size?: number, row?: number, col?: number }) => {
                if (ws) {
                    switch (message.command) {
                        case 'startGame':
                            ws.send(JSON.stringify({ command: 'startGame', size: message.size }));
                            break;
                        case 'blockTile':
                            ws.send(JSON.stringify({ command: 'blockTile', row: message.row, col: message.col }));
                            break;
                    }
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cat Trap Game</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }
                #hexgrid {
                    width: 100%;
                    background-color: lightgrey;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-bottom: 20px;
                    overflow: hidden; /* Ensure content doesn't overflow */
                }
                .control {
                    margin-bottom: 10px;
                }
                canvas {
                    border: none;
                }
            </style>
        </head>
        <body>
            <div id="hexgrid">
                <canvas id="hexCanvas"></canvas>
            </div>
            <div class="control">
                <button id="startGame">Start New Game</button>
            </div>
            <div class="control">
                <label for="gridSize">Enter an odd number for N:</label>
                <input type="number" id="gridSize" value="7" />
            </div>
            <div class="control">
                <label for="coordI">Row (i):</label>
                <input type="number" id="coordI" value="0" />
            </div>
            <div class="control">
                <label for="coordJ">Column (j):</label>
                <input type="number" id="coordJ" value="0" />
            </div>
            <div class="control">
                <button id="paintTile">Paint a Tile</button>
            </div>
            <div class="control">
                <button id="drawCat">Draw a Cat</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                let hexPositions = [];

                function drawHexGrid(canvas, N, gridData) {
                    const ctx = canvas.getContext('2d');
                    const hexSize = 20;  // Size of each hexagon
                    const hexWidth = Math.sqrt(3) * hexSize;
                    const hexHeight = 2 * hexSize;
                    const verticalSpacing = hexHeight * 0.75;
                    const horizontalSpacing = hexWidth;
                    const offsetX = hexWidth / 2 + 5;  // Shift right by 5 pixels
                    const offsetY = hexHeight / 2 + 5; // Shift down by 5 pixels

                    // Increase the canvas size to avoid clipping the hexagons
                    canvas.width = horizontalSpacing * N + offsetX + 5;
                    canvas.height = verticalSpacing * N + offsetY + 5;

                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    hexPositions = [];

                    for (let row = 0; row < N; row++) {
                        for (let col = 0; col < N; col++) {
                            const x = offsetX + col * horizontalSpacing + (row % 2) * (horizontalSpacing / 2);
                            const y = offsetY + row * verticalSpacing;
                            const tile = gridData[row][col];
                            drawHexagon(ctx, x, y, hexSize, tile);
                            hexPositions.push({ x, y, row, col });
                        }
                    }

                    // Adjust the container height to match the canvas height
                    document.getElementById('hexgrid').style.height = canvas.height + 'px';
                }

                function drawHexagon(ctx, x, y, size, tile) {
                    const sides = 6;
                    ctx.beginPath();
                    for (let i = 0; i < sides; i++) {
                        const angle = (Math.PI / 3) * i + Math.PI / 6;  // Rotate by 30 degrees
                        const x_i = x + size * Math.cos(angle);
                        const y_i = y + size * Math.sin(angle);
                        if (i === 0) {
                            ctx.moveTo(x_i, y_i);
                        } else {
                            ctx.lineTo(x_i, y_i);
                        }
                    }
                    ctx.closePath();
                    ctx.strokeStyle = 'white';
                    ctx.stroke();

                    if (tile === 1) {
                        ctx.fillStyle = '#787C7E'; // Blocked tile color
                    } else if (tile === 6) {
                        ctx.fillStyle = 'orange'; // Cat color
                        ctx.font = '20px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('😺', x, y);
                        return;
                    } else {
                        ctx.fillStyle = '#85C0F9'; // Free tile color
                    }
                    ctx.fill();
                }

                function getTileCoordinates(x, y) {
                    const hexSize = 20; // Should be same as in drawHexGrid
                    for (const hex of hexPositions) {
                        const dx = x - hex.x;
                        const dy = y - hex.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < hexSize) {
                            return { row: hex.row, col: hex.col };
                        }
                    }
                    return null;
                }

                document.getElementById('startGame').addEventListener('click', () => {
                    const gridSize = parseInt(document.getElementById('gridSize').value);
                    const canvas = document.getElementById('hexCanvas');
                    vscode.postMessage({ command: 'startGame', size: gridSize });
                });

                document.getElementById('paintTile').addEventListener('click', () => {
                    const canvas = document.getElementById('hexCanvas');
                    const ctx = canvas.getContext('2d');
                    const i = parseInt(document.getElementById('coordI').value);
                    const j = parseInt(document.getElementById('coordJ').value);
                    vscode.postMessage({ command: 'blockTile', row: i, col: j });
                });

                document.getElementById('hexCanvas').addEventListener('click', (event) => {
                    const rect = event.target.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;
                    const coords = getTileCoordinates(x, y);
                    if (coords) {
                        document.getElementById('coordI').value = coords.row;
                        document.getElementById('coordJ').value = coords.col;
                        vscode.postMessage({ command: 'blockTile', row: coords.row, col: coords.col });
                    }
                });

                window.addEventListener('resize', adjustHexgridHeight);

                function adjustHexgridHeight() {
                    const canvas = document.getElementById('hexCanvas');
                    const hexgrid = document.getElementById('hexgrid');
                    hexgrid.style.height = Math.min(window.innerHeight - 50, canvas.height) + 'px';
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'updateGrid') {
                        const canvas = document.getElementById('hexCanvas');
                        const gridSize = parseInt(document.getElementById('gridSize').value);
                        drawHexGrid(canvas, gridSize, JSON.parse(message.data));
                    }
                });
            </script>
        </body>
        </html>`;
}

exports.activate = activate;
