#!/usr/bin/env python3
"""
Scan current directory for subfolders containing index.html and produce an index.xml
Structure:
<games>
  <game name="foldername">
    <title>Optional Title</title>
    <file>foldername/index.html</file>
    <file>foldername/asset.png</file>
  </game>
</games>
Run this script from the repository root (or copy output to repo root) to produce index.xml.
"""
import os
import xml.etree.ElementTree as ET
from xml.dom import minidom

def prettify(elem):
    rough = ET.tostring(elem, 'utf-8')
    reparsed = minidom.parseString(rough)
    return reparsed.toprettyxml(indent="  ")

root_dir = os.path.abspath(os.path.dirname(__file__))
games_elem = ET.Element('games')

for entry in sorted(os.listdir(root_dir)):
    path = os.path.join(root_dir, entry)
    if os.path.isdir(path):
        # check for index.html
        idx = os.path.join(path, 'index.html')
        if os.path.isfile(idx):
            game_elem = ET.SubElement(games_elem, 'game', {'name': entry})
            title_elem = ET.SubElement(game_elem, 'title')
            title_elem.text = entry
            # walk files in this directory
            for dirpath, _, filenames in os.walk(path):
                for fn in sorted(filenames):
                    # produce path relative to repo root (where index.xml will sit)
                    rel = os.path.relpath(os.path.join(dirpath, fn), root_dir).replace(os.sep, '/')
                    f = ET.SubElement(game_elem, 'file')
                    f.text = rel

# write index.xml next to the script (or print it)
out = os.path.join(root_dir, 'index.xml')
with open(out, 'w', encoding='utf-8') as fh:
    fh.write(prettify(games_elem))

print('Wrote', out)
