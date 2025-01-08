import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import argparse
import glob
import os
import json
import numpy as np

def create_pose_detector():
    """Create and return a pose detector instance."""
    base_options = python.BaseOptions(model_asset_path='pose_landmarker.task')
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        output_segmentation_masks=True)
    return vision.PoseLandmarker.create_from_options(options)

def process_image(detector, image_path):
    """Process a single image and return the landmark data."""
    # Load and process image
    image = mp.Image.create_from_file(image_path)
    detection_result = detector.detect(image)
    
    # Convert landmarks to a serializable format
    landmarks_data = []
    for pose_landmarks in detection_result.pose_landmarks:
        # Convert each landmark to a dictionary
        landmarks = []
        for landmark in pose_landmarks:
            landmarks.append({
                'x': float(landmark.x),
                'y': float(landmark.y),
                'z': float(landmark.z),
                'visibility': float(landmark.visibility) if hasattr(landmark, 'visibility') else None,
                'presence': float(landmark.presence) if hasattr(landmark, 'presence') else None
            })
        landmarks_data.append(landmarks)
    
    return landmarks_data

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Process PNG files for pose detection')
    parser.add_argument('input_dir', help='Directory containing PNG files')
    parser.add_argument('output_file', help='Output JSON file path')
    parser.add_argument('--model', default='pose_landmarker.task',
                       help='Path to the pose landmarker task file')
    
    args = parser.parse_args()
    
    # Check if model file exists
    if not os.path.exists(args.model):
        print(f"Error: Model file '{args.model}' not found. Please download it using:")
        print("wget -O pose_landmarker.task https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task")
        return
    
    # Create detector
    detector = create_pose_detector()
    
    # Process all PNG files in the directory
    results = {}
    png_files = glob.glob(os.path.join(args.input_dir, '*.png'))
    
    if not png_files:
        print(f"No PNG files found in directory: {args.input_dir}")
        return
    
    for image_path in png_files:
        try:
            print(f"Processing {image_path}...")
            landmarks_data = process_image(detector, image_path)
            # Store results using relative path as key
            rel_path = os.path.relpath(image_path, args.input_dir)
            results[rel_path] = landmarks_data
        except Exception as e:
            print(f"Error processing {image_path}: {str(e)}")
    
    # Save results to JSON file
    try:
        with open(args.output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {args.output_file}")
    except Exception as e:
        print(f"Error saving results: {str(e)}")

if __name__ == "__main__":
    main()