// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

/*
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "cat-trap-game-ui" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('cat-trap-game-ui.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Cat Trap Game UI!');
	});

	context.subscriptions.push(disposable);
}
*/
// This method is called when your extension is deactivated
export function deactivate() {}


export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('cat-trap-game-ui.start', () => {
            const panel = vscode.window.createWebviewPanel(
                'catTrapGame', 
                'Cat Trap Game', 
                vscode.ViewColumn.One, 
                { enableScripts: true }
            );

            panel.webview.html = getWebviewContent();
        })
    );
}

function getWebviewContent() {
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
            height: 500px;  /* Increase height to ensure all hexagons are visible */
            background-color: lightgrey;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 20px;
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
        <label for="deadline">Deadline in seconds:</label>
        <input type="number" id="deadline" value="1" />
    </div>
    <div class="control">
        <input type="checkbox" id="randomCat" />
        <label for="randomCat">Random Cat</label>
    </div>
    <div class="control">
        <input type="checkbox" id="alphaBetaPruning" />
        <label for="alphaBetaPruning">Alpha-Beta Pruning</label>
    </div>
    <div class="control">
        <input type="checkbox" id="limitedDepth" />
        <label for="limitedDepth">Limited Depth</label>
    </div>
    <div class="control">
        <input type="checkbox" id="iterativeDeepening" />
        <label for="iterativeDeepening">Iterative Deepening</label>
    </div>
    <div class="control">
        <input type="checkbox" id="editMode" />
        <label for="editMode">Edit Mode</label>
    </div>
    <script>
        const vscode = acquireVsCodeApi();

        function drawHexGrid(canvas, N) {
            const ctx = canvas.getContext('2d');
            const hexSize = 20;  // Size of each hexagon
            const hexWidth = Math.sqrt(3) * hexSize;
            const hexHeight = 2 * hexSize;
            const verticalSpacing = hexHeight * 0.75;
            const horizontalSpacing = hexWidth;
            const offsetX = hexWidth / 2;
            const offsetY = hexHeight / 2;

            // Increase the canvas size to avoid clipping the hexagons
            canvas.width = horizontalSpacing * N + offsetX + hexWidth;
            canvas.height = verticalSpacing * N + offsetY + hexHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let row = 0; row < N; row++) {
                for (let col = 0; col < N; col++) {
                    const x = offsetX + col * horizontalSpacing + (row % 2) * (horizontalSpacing / 2);
                    const y = offsetY + row * verticalSpacing;
                    drawHexagon(ctx, x, y, hexSize);
                }
            }
        }

        function drawHexagon(ctx, x, y, size) {
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
            // Ensure the path is closed
            ctx.closePath();
            ctx.stroke();
        }

        document.getElementById('startGame').addEventListener('click', () => {
            const gridSize = parseInt(document.getElementById('gridSize').value);
            const canvas = document.getElementById('hexCanvas');
            drawHexGrid(canvas, gridSize);
        });
    </script>
</body>
</html>


    `;
}
