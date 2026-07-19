#!/bin/bash

# DevTunnels Port Forwarding Script for CinePurr
# This script helps forward ports 3000 and 4000 via DevTunnels

echo "🚀 CinePurr DevTunnels Port Forwarding"
echo "========================================"
echo ""

# Check if devtunnels is installed
if ! command -v devtunnels &> /dev/null; then
    echo "❌ DevTunnels CLI not found!"
    echo ""
    echo "Install it with:"
    echo "  npm install -g @microsoft/dev-tunnels"
    echo ""
    echo "Or use npx (no install needed):"
    echo "  npx @microsoft/dev-tunnels host -p 3000 --allow-anonymous --protocol https"
    exit 1
fi

# Check if logged in
if ! devtunnels user show &> /dev/null; then
    echo "🔐 You need to login first!"
    echo "Running: devtunnels user login"
    devtunnels user login
    echo ""
fi

echo "📡 Forwarding ports..."
echo ""
echo "Terminal 1 - Next.js (port 3000):"
echo "  devtunnels host -p 3000 --allow-anonymous --protocol https"
echo ""
echo "Terminal 2 - Socket.io (port 4000):"
echo "  devtunnels host -p 4000 --allow-anonymous --protocol https"
echo ""
echo "💡 Tip: Run these commands in separate terminal windows!"
echo ""
echo "After forwarding, set this environment variable:"
echo "  export PUBLIC_TUNNEL=1"
echo ""
echo "Then start your servers:"
echo "  npm run dev        # Terminal 3"
echo "  npm run server     # Terminal 4 (with PUBLIC_TUNNEL=1)"
echo ""

