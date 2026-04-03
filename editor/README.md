# Last Stand Map Editor

A standalone visual editor for creating and modifying Last Stand board configuration files.

## Features

- Visual interface to edit map tiles
- Support for all tile types (property, railroad, utility, tax, chance, chest, etc.)
- Edit tile names, prices, colors, rent arrays, and other properties
- Load existing `boardConfig.json` files
- Save edited maps as JSON files compatible with the game

## Requirements

- Python 3.6 or higher
- tkinter (usually pre-installed with Python)

## Usage

### Basic Usage

```bash
python map_editor.py
```

### Load an Existing Map

```bash
python map_editor.py ../client/boardConfig.json
```

### Creating a Windows Executable (Optional)

If you want to create a standalone .exe file that doesn't require Python:

```bash
pip install pyinstaller
pyinstaller --onefile --windowed --name "Last Stand Map Editor" map_editor.py
```

The executable will be created in the `dist/` folder.

## Workflow

1. **Open** an existing `boardConfig.json` file or start with a new file
2. **Select** a tile from the list on the left
3. **Edit** the tile properties in the panel on the right
4. **Update Tile** to save your changes to that tile
5. **Save** the file when you're done editing

## JSON Format

The editor creates JSON files with the following structure:

```json
{
  "_comment": "Full board configuration...",
  "_schema": { ... },
  "tiles": [
    {
      "id": 0,
      "type": "go",
      "name": "Start",
      "reward": 200
    },
    {
      "id": 1,
      "type": "property",
      "name": "Property Name",
      "price": 60,
      "rent": [2, 10, 30, 90, 160, 250],
      "color": "brown",
      "group": 0
    }
  ]
}
```

## Tile Types

- **go**: Starting tile with reward
- **property**: Purchasable property with rent, color, and group
- **railroad**: Special property type
- **utility**: Special property type
- **tax**: Tax tile with cost
- **chance**: Chance card tile
- **chest**: Community chest tile
- **jail**: Jail tile
- **go_to_jail**: Go to jail tile
- **free_parking**: Free parking tile

## Notes

- The editor validates that tiles have appropriate fields for their type
- Rent arrays for properties should have 6 values: [base, 1house, 2houses, 3houses, 4houses, hotel]
- Tile IDs should match the server's board layout (0-43 for a 44-tile board)
- Changes are saved to the JSON file and can be directly used by the game server
