#!/bin/bash
# setup-swap.sh
# Creates a 2GB swap file and configures swappiness on Ubuntu

# Exit on error
set -e

SWAP_SIZE="2G"
SWAP_FILE="/swapfile"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

echo "Creating ${SWAP_SIZE} swap file at ${SWAP_FILE}..."
# fallocate is faster, fallback to dd if unsupported on the filesystem
fallocate -l ${SWAP_SIZE} ${SWAP_FILE} || dd if=/dev/zero of=${SWAP_FILE} bs=1M count=2048

echo "Setting permissions..."
chmod 600 ${SWAP_FILE}

echo "Making swap space..."
mkswap ${SWAP_FILE}

echo "Enabling swap..."
swapon ${SWAP_FILE}

echo "Persisting swap to /etc/fstab..."
if ! grep -q "${SWAP_FILE}" /etc/fstab; then
  echo "${SWAP_FILE} none swap sw 0 0" >> /etc/fstab
fi

echo "Configuring swappiness and cache pressure..."
sysctl vm.swappiness=10
sysctl vm.vfs_cache_pressure=50

echo "Persisting sysctl settings to /etc/sysctl.conf..."
if ! grep -q "vm.swappiness=10" /etc/sysctl.conf; then
  echo "vm.swappiness=10" >> /etc/sysctl.conf
fi
if ! grep -q "vm.vfs_cache_pressure=50" /etc/sysctl.conf; then
  echo "vm.vfs_cache_pressure=50" >> /etc/sysctl.conf
fi

echo "Swap setup complete!"
free -h
