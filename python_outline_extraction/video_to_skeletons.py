import mediapipe as mp  # via pip install mediapipe
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import cv2
import argparse
import os
import json

def create_pose_detector(model_path='pose_landmarker.task'):
    """Create and return a pose detector instance."""
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        output_segmentation_masks=True
    )
    return vision.PoseLandmarker.create_from_options(options)

def process_image(detector, image):
    """
    Process a single MediaPipe Image or file-path and return the landmark data with metadata.
    (Body of this function is unchanged from your original, except for accepting an mp.Image.)
    """
    # if user passed a filename, load it
    if isinstance(image, str):
        image = mp.Image.create_from_file(image)

    detection_result = detector.detect(image)

    # Metadata for landmarks
    pose_landmark_names = [lm.name for lm in mp.solutions.pose.PoseLandmark]

    # Convert landmarks to a serializable format
    landmarks_data = []
    for pose_landmarks in detection_result.pose_landmarks:
        landmarks = []
        for idx, landmark in enumerate(pose_landmarks):
            landmarks.append({
                'name': pose_landmark_names[idx],
                'x': float(landmark.x),
                'y': float(landmark.y),
                'z': float(landmark.z),
                'visibility': float(landmark.visibility) if hasattr(landmark, 'visibility') else None,
                'presence':   float(landmark.presence)   if hasattr(landmark, 'presence')   else None
            })
        landmarks_data.append({'landmarks': landmarks})

    return landmarks_data

def process_video(detector, video_path):
    """
    Read each frame from the video, run pose detection, and collect results in the
    same JSON-layout as your folder-of-PNGs version.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video file {video_path}")

    # Prepare the top-level JSON structure
    grouped = {
        'data': {},
        'connections': {}
    }

    # Build the connections mapping
    pose_names = [lm.name for lm in mp.solutions.pose.PoseLandmark]
    for start, end in mp.solutions.pose.POSE_CONNECTIONS:
        grouped['connections'][pose_names[start]] = pose_names[end]

    # Use the video filename (no ext) as the “parent_dir” key
    video_key = os.path.splitext(os.path.basename(video_path))[0]
    grouped['data'][video_key] = {}

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Convert BGR→RGB and wrap as mp.Image
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        try:
            landmarks = process_image(detector, mp_img)
            # Name frames similarly to your PNG-based version
            grouped['data'][video_key][f'frame_{frame_idx}.png'] = landmarks
        except Exception as e:
            print(f"Error on frame {frame_idx}: {e}")

        frame_idx += 1

    cap.release()
    return grouped

def main():
    parser = argparse.ArgumentParser(
        description='Compute pose landmarks per frame of an MP4 video'
    )
    parser.add_argument('video_path', help='Path to input .mp4 file')
    parser.add_argument('output_file', help='Where to save the JSON results')
    parser.add_argument(
        '--model', default='pose_landmarker.task',
        help='Path to your MediaPipe pose_landmarker.task file'
    )
    args = parser.parse_args()

    if not os.path.exists(args.model):
        print(f"Error: Model file '{args.model}' not found.")
        print("Download it with, for example:")
        print("  wget -O pose_landmarker.task \\")
        print("    https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task")
        return

    detector = create_pose_detector(args.model)
    results = process_video(detector, args.video_path)

    with open(args.output_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Results saved to {args.output_file}")

if __name__ == "__main__":
    main()
