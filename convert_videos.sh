#!/bin/bash

# Exit script on error
set -e

# Check if the input file is provided
if [ $# -lt 1 ]; then
  echo "Usage: $0 <video_file>"
  exit 1
fi

# Input video file
VIDEO_FILE="$1"

# Get the base name of the video file (without directory and suffix)
VIDEO_BASENAME=$(basename "$VIDEO_FILE" | sed 's/\\.[^.]*$//')

# Get the directory of the video file
VIDEO_DIR=$(dirname "$VIDEO_FILE")

# Output directories
FRAME_DIR="${VIDEO_DIR}/${VIDEO_BASENAME}_frames"
TEXTURE_DIR="${VIDEO_DIR}/${VIDEO_BASENAME}_textures"

# Clear directories if they exist
if [ -d "$FRAME_DIR" ]; then
  rm -rf "$FRAME_DIR"
fi
if [ -d "$TEXTURE_DIR" ]; then
  rm -rf "$TEXTURE_DIR"
fi

# Recreate directories
mkdir -p "$FRAME_DIR" "$TEXTURE_DIR"

# Step 1: Downscale video to 480p and 20 fps, and extract frames
echo "Extracting frames from video..."
ffmpeg -i "$VIDEO_FILE" -vf "scale=640:480,fps=20" "$FRAME_DIR/frame_%04d.png"

# Step 2: Convert frames to KTX2 textures using basisu
echo "Compressing frames into KTX2 textures..."
basisu -ktx2 --no_mipmaps "$FRAME_DIR"/*.png -output_path "$TEXTURE_DIR"


echo "Compression complete. Textures saved to $TEXTURE_DIR."
