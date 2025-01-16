import mediapipe as mp # via pip install mediapipe
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
    """Process a single image and return the landmark data with metadata."""
    # Load and process image
    image = mp.Image.create_from_file(image_path)
    detection_result = detector.detect(image)

    # Metadata for landmarks and connections
    pose_landmark_names = [landmark.name for landmark in mp.solutions.pose.PoseLandmark]
    

    # Convert landmarks to a serializable format
    landmarks_data = []
    #this iteration is for each detected body
    for pose_landmarks in detection_result.pose_landmarks:
        # Convert each landmark to a dictionary with metadata
        landmarks = []
        for idx, landmark in enumerate(pose_landmarks):
            landmarks.append({
                'name': pose_landmark_names[idx],
                'x': float(landmark.x),
                'y': float(landmark.y),
                'z': float(landmark.z),
                'visibility': float(landmark.visibility) if hasattr(landmark, 'visibility') else None,
                'presence': float(landmark.presence) if hasattr(landmark, 'presence') else None
            }) 

        landmarks_data.append({
            'landmarks': landmarks
        })

    return landmarks_data

def collect_png_files(input_dir, nested):
    """Collect PNG files from the input directory. If nested is True, search subdirectories."""
    if nested:
        return sorted(glob.glob(os.path.join(input_dir, '**', '*.png'), recursive=True))
    else:
        return sorted(glob.glob(os.path.join(input_dir, '*.png')))


def compute_skeletons_for_folder_of_videos(input_dir, neststed, output_file):
    detector = create_pose_detector()

    # Collect PNG files
    png_files = collect_png_files(input_dir, neststed)

    if not png_files:
        print(f"No PNG files found in directory: {input_dir}")
        return

    results = []
    grouped_results = {}
    grouped_results['data'] = {}

    connections = mp.solutions.pose.POSE_CONNECTIONS
    pose_landmark_names = [landmark.name for landmark in mp.solutions.pose.PoseLandmark]
    grouped_results['connections'] = {}
    for connection in connections:
        start_idx, end_idx = connection
        # connections_data.append({
        #     'start_landmark': pose_landmark_names[start_idx],
        #     'end_landmark': pose_landmark_names[end_idx]
        # })
        grouped_results['connections'][pose_landmark_names[start_idx]] = pose_landmark_names[end_idx]

    for image_path in png_files:
        try:
            print(f"Processing {image_path}...")
            landmarks_data = process_image(detector, image_path)

            # Group results by parent directory (relative to input_dir)
            parent_dir = os.path.relpath(os.path.dirname(image_path), input_dir)
            file_name = os.path.basename(image_path)

            if parent_dir not in grouped_results['data']:
                grouped_results['data'][parent_dir] = {}

            grouped_results['data'][parent_dir][file_name] = landmarks_data
        except Exception as e:
            print(f"Error processing {image_path}: {str(e)}")

    

    return grouped_results


def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Process PNG files for pose detection')
    parser.add_argument('input_dir', help='Directory containing PNG files or directories of PNG files')
    parser.add_argument('output_file', help='Output JSON file path')
    parser.add_argument('--model', default='pose_landmarker.task',
                       help='Path to the pose landmarker task file')
    parser.add_argument('--nested', action='store_true',
                        help='Indicate if the input directory contains directories of PNG files')

    args = parser.parse_args()

    # Check if model file exists
    if not os.path.exists(args.model):
        print(f"Error: Model file '{args.model}' not found. Please download it using:")
        print("wget -O pose_landmarker.task https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task")
        return

    # Create detector
    results = compute_skeletons_for_folder_of_videos(args.input_dir, args.nested, args.output_file)

    # Save results to JSON file
    try:
        with open(args.output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {args.output_file}")
    except Exception as e:
        print(f"Error saving results: {str(e)}")

if __name__ == "__main__":
    main()
