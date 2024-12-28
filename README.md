# Cat Trap VSCode Extension

## Overview
This is a VSCode extension for the GUI used in the LinkedIn Learning Course **AI Algorithms for Game Design with Python**, by Eduardo Corpeño.
The Cat Trap VSCode Extension brings a fully interactive hexagonal grid game directly into your Visual Studio Code environment. Play the classic *Cat Trap* game with various strategies and customizable settings, all while visualizing the gameplay within your editor.

## Features
- **Interactive Hexgrid**: A responsive hexagonal grid for the cat to navigate.
- **Customizable Board**: Adjust the grid size to your preference.
- **Cat Movement Strategies**:
  - Random Cat
  - Minimax
  - Limited Depth
  - Iterative Deepening
- **Advanced Settings**:
  - Deadline configuration in seconds.
  - Alpha-Beta Pruning toggle for optimized search.
- **Edit Mode**: Place or remove obstacles or the cat directly on the grid.

## How to Use
1. **Run your Server (main.py) and Start the Extension**
   - Run your server application in main.py.
   - Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Run `Start Cat Trap Game`.
2. **Start a New Game**:
   - Click the "Start New Game" button.
   - Set the grid size using the **Hexgrid Size** input.
3. **Select a Strategy**:
   - Choose from the available strategies:
     - Random Cat
     - Minimax
     - Limited Depth (Specify depth value)
     - Iterative Deepening
4. **Configure Settings**:
   - Set the **Deadline** for cat moves in seconds.
   - Toggle **Alpha-Beta Pruning** for enhanced performance.
5. **Edit Mode**:
   - Enable **Edit Mode** to place or remove obstacles or the cat on the grid.

## Default Settings
- **Hexgrid Size**: 7
- **Deadline**: 5 seconds
- **Strategy**: Iterative Deepening
- **Limited Depth**: 4
- **Alpha-Beta Pruning**: Enabled
- **Edit Mode**: Disabled by default

## Installation
1. Package the extension into a `.vsix` file using:
   ```bash
   vsce package
   ```
2. Install the extension in VSCode:
   - Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Run `Extensions: Install from VSIX...`.
   - Select the `.vsix` file.

## Controls
- **Mouse Clicks**: Interact with tiles to place or remove obstacles.
- **UI Controls**:
   - Start New Game
   - Strategy selection
   - Input settings for Deadline and Hexgrid Size

## Known Issues
- None so far! Report any bugs or suggestions.

## License
This extension is released under the [MIT License](LICENSE).
