#!/bin/bash
# APKPure Skills Plugin Installer
# Installs the apkpure CLI tool globally so the skill can use it

set -e

echo "Installing APKPure Skills Plugin..."

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "✗ Node.js is required but not installed. Please install Node.js >= 20."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "✗ Node.js >= 20 is required. Current: $(node -v)"
  exit 1
fi

# Install apkpure CLI globally from the local package
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/dist/cli.js" ]; then
  # Install from local dist
  npm install -g "$SCRIPT_DIR" 2>/dev/null || {
    echo "⚠ Global install failed (may need sudo). The skill will use npx instead."
    echo "  To install manually: sudo npm install -g $SCRIPT_DIR"
  }
  echo "✓ APKPure CLI installed from local package"
elif command -v npx &>/dev/null; then
  echo "✓ npx available — will use npx apkpure for commands"
else
  echo "✗ Neither npm install nor npx is available"
  exit 1
fi

# Verify installation
if command -v apkpure &>/dev/null; then
  echo "✓ apkpure CLI available: $(apkpure --version 2>/dev/null || echo 'installed')"
elif command -v npx &>/dev/null; then
  echo "✓ Will use: npx apkpure"
fi

# Set up default download directory
DOWNLOAD_DIR="${HOME}/.apkpure/downloads"
mkdir -p "$DOWNLOAD_DIR"
echo "✓ Download directory: $DOWNLOAD_DIR"

echo ""
echo "Installation complete!"
echo ""
echo "Quick start:"
echo "  npx apkpure search telegram"
echo "  npx apkpure workflow download-by-name -q \"Telegram\""
echo "  npx apkpure workflow app-intelligence -p org.telegram.messenger"
