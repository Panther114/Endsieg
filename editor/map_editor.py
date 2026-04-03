#!/usr/bin/env python3
"""
Visual Map Editor for Last Stand Monopoly Game
A standalone offline tool to edit boardConfig.json files

Requirements: tkinter (usually pre-installed with Python)
Usage: python map_editor.py [optional_path_to_json]
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import json
import os
import sys

# Valid tile types
TILE_TYPES = ['go', 'jail', 'free_parking', 'go_to_jail', 'property', 'railroad', 'utility', 'chance', 'chest', 'tax']

# Valid color groups
COLOR_GROUPS = ['brown', 'cyan', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue',
                'purple', 'navy', 'teal', 'lime', 'maroon', 'coral', 'gold', 'violet',
                'indigo', 'emerald', 'white', 'black']

class MapEditor:
    def __init__(self, root, initial_file=None):
        self.root = root
        self.root.title("Last Stand Map Editor")
        self.root.geometry("1200x800")

        self.current_file = initial_file
        self.tiles = []
        self.unsaved_changes = False

        self.setup_ui()

        if initial_file and os.path.exists(initial_file):
            self.load_file(initial_file)
        else:
            self.load_default_structure()

    def setup_ui(self):
        """Setup the main UI layout"""
        # Menu bar
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="File", menu=file_menu)
        file_menu.add_command(label="Open JSON", command=self.open_file)
        file_menu.add_command(label="Save", command=self.save_file)
        file_menu.add_command(label="Save As", command=self.save_file_as)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.exit_app)

        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        # Top: File info
        info_frame = ttk.Frame(main_frame)
        info_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        self.file_label = ttk.Label(info_frame, text="No file loaded", font=('Arial', 10, 'bold'))
        self.file_label.pack(side=tk.LEFT)

        # Left: Tile list
        left_frame = ttk.LabelFrame(main_frame, text="Tiles", padding="10")
        left_frame.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(0, 5))

        # Tile listbox with scrollbar
        list_frame = ttk.Frame(left_frame)
        list_frame.pack(fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.tile_listbox = tk.Listbox(list_frame, yscrollcommand=scrollbar.set,
                                        font=('Courier', 9), width=40)
        self.tile_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.tile_listbox.yview)

        self.tile_listbox.bind('<<ListboxSelect>>', self.on_tile_select)

        # Right: Tile editor
        right_frame = ttk.LabelFrame(main_frame, text="Edit Tile", padding="10")
        right_frame.grid(row=1, column=1, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(5, 0))

        main_frame.columnconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=2)
        main_frame.rowconfigure(1, weight=1)

        # Editor fields
        self.editor_frame = ttk.Frame(right_frame)
        self.editor_frame.pack(fill=tk.BOTH, expand=True)

        # ID (read-only)
        row = 0
        ttk.Label(self.editor_frame, text="Tile ID:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.id_var = tk.StringVar()
        ttk.Entry(self.editor_frame, textvariable=self.id_var, state='readonly', width=30).grid(row=row, column=1, sticky=(tk.W, tk.E), pady=5)

        # Type
        row += 1
        ttk.Label(self.editor_frame, text="Type:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.type_var = tk.StringVar()
        type_combo = ttk.Combobox(self.editor_frame, textvariable=self.type_var,
                                   values=TILE_TYPES, state='readonly', width=28)
        type_combo.grid(row=row, column=1, sticky=(tk.W, tk.E), pady=5)
        type_combo.bind('<<ComboboxSelected>>', self.on_type_change)

        # Name
        row += 1
        ttk.Label(self.editor_frame, text="Name:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.name_var = tk.StringVar()
        ttk.Entry(self.editor_frame, textvariable=self.name_var, width=30).grid(row=row, column=1, sticky=(tk.W, tk.E), pady=5)

        # Price (for property/railroad/utility)
        row += 1
        self.price_label = ttk.Label(self.editor_frame, text="Price:")
        self.price_label.grid(row=row, column=0, sticky=tk.W, pady=5)
        self.price_var = tk.StringVar()
        self.price_entry = ttk.Entry(self.editor_frame, textvariable=self.price_var, width=30)
        self.price_entry.grid(row=row, column=1, sticky=(tk.W, tk.E), pady=5)

        # Color (for property)
        row += 1
        self.color_label = ttk.Label(self.editor_frame, text="Color Group:")
        self.color_label.grid(row=row, column=0, sticky=tk.W, pady=5)
        self.color_var = tk.StringVar()
        self.color_combo = ttk.Combobox(self.editor_frame, textvariable=self.color_var,
                                        values=COLOR_GROUPS, state='readonly', width=28)
        self.color_combo.grid(row=row, column=1, sticky=(tk.W, tk.E), pady=5)

        # Group (for property)
        row += 1
        self.group_label = ttk.Label(self.editor_frame, text="Group ID:")
        self.group_label.grid(row=row, column=0, sticky=tk.W, pady=5)
        self.group_var = tk.StringVar()
        self.group_entry = ttk.Entry(self.editor_frame, textvariable=self.group_var, width=30)
        self.group_entry.grid(row=row, column=1, sticky=(tk.W, tk.E), pady=5)

        # Rent (for property)
        row += 1
        self.rent_label = ttk.Label(self.editor_frame, text="Rent Array:")
        self.rent_label.grid(row=row, column=0, sticky=tk.W, pady=5)
        rent_help = ttk.Label(self.editor_frame, text="[base, 1h, 2h, 3h, 4h, hotel]",
                              font=('Arial', 8), foreground='gray')
        rent_help.grid(row=row, column=1, sticky=tk.W, pady=(0, 2))

        row += 1
        self.rent_var = tk.StringVar()
        self.rent_entry = ttk.Entry(self.editor_frame, textvariable=self.rent_var, width=30)
        self.rent_entry.grid(row=row, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5, padx=(0, 0))

        # Cost (for tax)
        row += 1
        self.cost_label = ttk.Label(self.editor_frame, text="Tax Cost:")
        self.cost_label.grid(row=row, column=0, sticky=tk.W, pady=5)
        self.cost_var = tk.StringVar()
        self.cost_entry = ttk.Entry(self.editor_frame, textvariable=self.cost_var, width=30)
        self.cost_entry.grid(row=row, column=1, sticky=(tk.W, tk.E), pady=5)

        # Reward (for GO)
        row += 1
        self.reward_label = ttk.Label(self.editor_frame, text="GO Reward:")
        self.reward_label.grid(row=row, column=0, sticky=tk.W, pady=5)
        self.reward_var = tk.StringVar()
        self.reward_entry = ttk.Entry(self.editor_frame, textvariable=self.reward_var, width=30)
        self.reward_entry.grid(row=row, column=1, sticky=(tk.W, tk.E), pady=5)

        # Save button
        row += 1
        button_frame = ttk.Frame(self.editor_frame)
        button_frame.grid(row=row, column=0, columnspan=2, pady=20)
        ttk.Button(button_frame, text="Update Tile", command=self.update_tile).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Revert Changes", command=self.revert_tile).pack(side=tk.LEFT, padx=5)

        self.editor_frame.columnconfigure(1, weight=1)

        # Initially disable editor
        self.toggle_editor(False)

    def toggle_editor(self, enabled):
        """Enable or disable editor fields"""
        state = 'normal' if enabled else 'disabled'
        for widget in [self.name_var, self.price_var, self.color_var, self.group_var,
                       self.rent_var, self.cost_var, self.reward_var]:
            # Note: Can't change Entry state directly with StringVar
            pass

    def load_default_structure(self):
        """Load a minimal default structure"""
        self.tiles = []
        self.update_tile_list()
        self.file_label.config(text="New file (not saved)")

    def load_file(self, filepath):
        """Load a JSON file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)

            if 'tiles' not in data or not isinstance(data['tiles'], list):
                messagebox.showerror("Error", "Invalid JSON structure: missing 'tiles' array")
                return

            self.tiles = data['tiles']
            self.current_file = filepath
            self.unsaved_changes = False
            self.update_tile_list()
            self.file_label.config(text=f"File: {os.path.basename(filepath)}")
            messagebox.showinfo("Success", f"Loaded {len(self.tiles)} tiles from {os.path.basename(filepath)}")
        except json.JSONDecodeError as e:
            messagebox.showerror("Error", f"Invalid JSON: {e}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load file: {e}")

    def update_tile_list(self):
        """Update the tile listbox"""
        self.tile_listbox.delete(0, tk.END)
        for tile in self.tiles:
            tile_id = tile.get('id', '?')
            tile_type = tile.get('type', 'unknown')
            tile_name = tile.get('name', 'Unnamed')
            self.tile_listbox.insert(tk.END, f"[{tile_id:2d}] {tile_type:12s} - {tile_name}")

    def on_tile_select(self, event):
        """Handle tile selection"""
        selection = self.tile_listbox.curselection()
        if not selection:
            return

        idx = selection[0]
        if idx >= len(self.tiles):
            return

        tile = self.tiles[idx]
        self.current_tile_index = idx

        # Populate editor fields
        self.id_var.set(str(tile.get('id', '')))
        self.type_var.set(tile.get('type', ''))
        self.name_var.set(tile.get('name', ''))
        self.price_var.set(str(tile.get('price', '')))
        self.color_var.set(tile.get('color', ''))
        self.group_var.set(str(tile.get('group', '')))

        # Rent array
        rent = tile.get('rent', [])
        if isinstance(rent, list):
            self.rent_var.set(','.join(map(str, rent)))
        else:
            self.rent_var.set('')

        self.cost_var.set(str(tile.get('cost', '')))
        self.reward_var.set(str(tile.get('reward', '')))

        self.update_field_visibility()

    def on_type_change(self, event):
        """Handle type change to show/hide relevant fields"""
        self.update_field_visibility()

    def update_field_visibility(self):
        """Show/hide fields based on tile type"""
        tile_type = self.type_var.get()

        # Property/Railroad/Utility fields
        show_price = tile_type in ['property', 'railroad', 'utility']
        self.toggle_field(self.price_label, self.price_entry, show_price)

        # Property-specific fields
        show_property = tile_type == 'property'
        self.toggle_field(self.color_label, self.color_combo, show_property)
        self.toggle_field(self.group_label, self.group_entry, show_property)
        self.toggle_field(self.rent_label, self.rent_entry, show_property)

        # Tax field
        show_tax = tile_type == 'tax'
        self.toggle_field(self.cost_label, self.cost_entry, show_tax)

        # GO field
        show_go = tile_type == 'go'
        self.toggle_field(self.reward_label, self.reward_entry, show_go)

    def toggle_field(self, label, widget, show):
        """Show or hide a field"""
        if show:
            label.grid()
            widget.grid()
        else:
            label.grid_remove()
            widget.grid_remove()

    def update_tile(self):
        """Update the currently selected tile"""
        if not hasattr(self, 'current_tile_index') or self.current_tile_index >= len(self.tiles):
            messagebox.showwarning("Warning", "No tile selected")
            return

        tile = self.tiles[self.current_tile_index]

        # Update basic fields
        tile['type'] = self.type_var.get()
        tile['name'] = self.name_var.get()

        # Update type-specific fields
        tile_type = tile['type']

        # Clean up fields that don't apply to this type
        if tile_type not in ['property', 'railroad', 'utility']:
            tile.pop('price', None)
        else:
            try:
                tile['price'] = int(self.price_var.get()) if self.price_var.get() else 0
            except ValueError:
                tile.pop('price', None)

        if tile_type != 'property':
            tile.pop('color', None)
            tile.pop('group', None)
            tile.pop('rent', None)
        else:
            tile['color'] = self.color_var.get()
            try:
                tile['group'] = int(self.group_var.get()) if self.group_var.get() else 0
            except ValueError:
                tile['group'] = 0

            # Parse rent array
            rent_str = self.rent_var.get()
            if rent_str:
                try:
                    rent = [int(x.strip()) for x in rent_str.split(',')]
                    tile['rent'] = rent
                except ValueError:
                    messagebox.showwarning("Warning", "Invalid rent array format")

        if tile_type != 'tax':
            tile.pop('cost', None)
        else:
            try:
                tile['cost'] = int(self.cost_var.get()) if self.cost_var.get() else 0
            except ValueError:
                tile.pop('cost', None)

        if tile_type != 'go':
            tile.pop('reward', None)
        else:
            try:
                tile['reward'] = int(self.reward_var.get()) if self.reward_var.get() else 200
            except ValueError:
                tile['reward'] = 200

        self.unsaved_changes = True
        self.update_tile_list()
        self.tile_listbox.selection_set(self.current_tile_index)
        messagebox.showinfo("Success", "Tile updated")

    def revert_tile(self):
        """Revert changes to current tile"""
        if hasattr(self, 'current_tile_index'):
            self.on_tile_select(None)

    def open_file(self):
        """Open a JSON file"""
        filepath = filedialog.askopenfilename(
            title="Open Map JSON",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        if filepath:
            self.load_file(filepath)

    def save_file(self):
        """Save the current file"""
        if not self.current_file:
            self.save_file_as()
            return

        self.write_file(self.current_file)

    def save_file_as(self):
        """Save as a new file"""
        filepath = filedialog.asksaveasfilename(
            title="Save Map JSON",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        if filepath:
            self.write_file(filepath)
            self.current_file = filepath
            self.file_label.config(text=f"File: {os.path.basename(filepath)}")

    def write_file(self, filepath):
        """Write JSON to file"""
        try:
            # Build complete structure
            output = {
                "_comment": "Full board configuration. All fields are optional overrides of server/boardData.js defaults.",
                "_schema": {
                    "id": "Required. Must match a tile ID in server/boardData.js (0–43).",
                    "name": "Display name shown on the tile.",
                    "type": "Tile type: 'go'|'jail'|'free_parking'|'go_to_jail'|'property'|'railroad'|'utility'|'chance'|'chest'|'tax'",
                    "price": "Purchase price (for property/railroad/utility).",
                    "rent": "[base, 1house, 2houses, 3houses, 4houses, hotel] rent values (for property).",
                    "color": "Property color group: 'brown'|'cyan'|'pink'|'orange'|'red'|'yellow'|'green'|'darkblue'|'purple'|'navy'|'teal'|'lime'|'maroon'|'coral'|'gold'|'violet'|'indigo'|'emerald'|'white'|'black'",
                    "group": "Numeric group ID — tiles with same group form a monopoly set.",
                    "cost": "Amount paid when landing on a tax tile.",
                    "reward": "Amount collected when landing on/passing GO."
                },
                "tiles": self.tiles
            }

            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)

            self.unsaved_changes = False
            messagebox.showinfo("Success", f"Saved to {os.path.basename(filepath)}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save file: {e}")

    def exit_app(self):
        """Exit the application"""
        if self.unsaved_changes:
            result = messagebox.askyesnocancel("Unsaved Changes",
                                                "You have unsaved changes. Save before exiting?")
            if result is None:  # Cancel
                return
            elif result:  # Yes
                self.save_file()

        self.root.destroy()


def main():
    """Main entry point"""
    root = tk.Tk()

    initial_file = None
    if len(sys.argv) > 1:
        initial_file = sys.argv[1]

    app = MapEditor(root, initial_file)

    # Handle window close
    root.protocol("WM_DELETE_WINDOW", app.exit_app)

    root.mainloop()


if __name__ == '__main__':
    main()
