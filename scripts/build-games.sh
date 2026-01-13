#!/bin/bash
# Build script to download games from Firewall-Freedom/file-s
# and set up the game dictionary in /static/CODE/games/ext
# Uses UI design from Timmmy307/file-s

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GAMES_DIR="$PROJECT_ROOT/static/CODE/games/ext"
TEMP_DIR="/tmp/games-build-$$"

echo "🎮 Building Game Dictionary..."
echo "================================"

# Clean up any existing ext folder
if [ -d "$GAMES_DIR" ]; then
    echo "📁 Removing old games folder..."
    rm -rf "$GAMES_DIR"
fi

mkdir -p "$GAMES_DIR"
mkdir -p "$TEMP_DIR"

# Clone the games repo (Firewall-Freedom for clean games)
echo "📥 Cloning Firewall-Freedom/file-s (games)..."
git clone --depth 1 https://github.com/Firewall-Freedom/file-s.git "$TEMP_DIR/games" 2>/dev/null || {
    echo "❌ Failed to clone Firewall-Freedom repository"
    exit 1
}

# Clone the UI repo (Timmmy307 for nice HTML design)
echo "📥 Cloning Timmmy307/file-s (UI)..."
git clone --depth 1 https://github.com/Timmmy307/file-s.git "$TEMP_DIR/ui" 2>/dev/null || {
    echo "❌ Failed to clone Timmmy307 repository"
    exit 1
}

# Copy all game folders (skip hidden files and scripts)
echo "📋 Copying game folders..."
cd "$TEMP_DIR/games"

# Count games
GAME_COUNT=0
for dir in */; do
    if [ -d "$dir" ] && [ -f "$dir/index.html" ]; then
        GAME_COUNT=$((GAME_COUNT + 1))
    fi
done

echo "   Found $GAME_COUNT games"

# Copy each game folder
for dir in */; do
    if [ -d "$dir" ] && [ -f "$dir/index.html" ]; then
        game_name="${dir%/}"
        echo "   ✓ $game_name"
        cp -r "$dir" "$GAMES_DIR/"
        
        # Remove the access cookie check from each game's index.html (multi-line pattern)
        if [ -f "$GAMES_DIR/$game_name/index.html" ]; then
            perl -i -0pe 's/<script>\(function \(\) \{[^<]*accessValue !== "1"[^<]*window\.location\.replace\("[^"]*"\);[^<]*\}\)\(\);<\/script>\s*//gs' "$GAMES_DIR/$game_name/index.html" 2>/dev/null || true
        fi
    fi
done

# Copy the XML generator script if it exists
if [ -f "new.py" ]; then
    cp new.py "$GAMES_DIR/"
fi

# Generate index.xml
echo "📝 Generating index.xml..."
cd "$GAMES_DIR"

cat > index.xml << 'XMLHEAD'
<?xml version="1.0" encoding="UTF-8"?>
<games>
XMLHEAD

for dir in */; do
    if [ -d "$dir" ] && [ -f "$dir/index.html" ]; then
        game_name="${dir%/}"
        # Create a title from folder name (capitalize, replace dashes with spaces)
        title=$(echo "$game_name" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
        
        echo "  <game name=\"$game_name\">" >> index.xml
        echo "    <title>$title</title>" >> index.xml
        echo "    <file>$game_name/index.html</file>" >> index.xml
        echo "  </game>" >> index.xml
    fi
done

echo "</games>" >> index.xml

# Copy and modify the Timmmy307 index.html for our game dictionary
echo "🎨 Copying Timmmy307 UI design..."
if [ -f "$TEMP_DIR/ui/index.html" ]; then
    # Copy the index.html
    cp "$TEMP_DIR/ui/index.html" "$GAMES_DIR/index.html"
    
    # Remove the access cookie check script at the top (multi-line pattern)
    # The script looks like: <script>(function () { ... accessValue !== "1" ... window.location.replace("/sorry.html"); ... })();</script>
    perl -i -0pe 's/<script>\(function \(\) \{[^<]*accessValue !== "1"[^<]*window\.location\.replace\("[^"]*"\);[^<]*\}\)\(\);<\/script>\s*//gs' "$GAMES_DIR/index.html"
    
    # Also remove the 404.js script reference
    sed -i 's/<script src="404.js"><\/script>//g' "$GAMES_DIR/index.html"
    
    # Update paths - make index.xml relative to current folder
    sed -i "s|const INDEX_XML_URL = '/index.xml';|const INDEX_XML_URL = 'index.xml';|g" "$GAMES_DIR/index.html"
    
    # Copy 404.js if it exists (may be needed for some functionality)
    if [ -f "$TEMP_DIR/ui/404.js" ]; then
        cp "$TEMP_DIR/ui/404.js" "$GAMES_DIR/404.js"
    fi
    
    echo "   ✓ Copied Timmmy307 UI"
else
    echo "   ⚠ Timmmy307 index.html not found, using fallback"
fi

# Clean up temp directory
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Game Dictionary built successfully!"
echo "   Location: $GAMES_DIR"
echo "   Games: $GAME_COUNT"
echo ""
echo "   Access at: /CODE/games/ext/"
