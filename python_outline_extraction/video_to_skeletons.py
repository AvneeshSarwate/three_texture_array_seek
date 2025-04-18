import mediapipe as mp  # via pip install mediapipe
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import cv2
import argparse
import os
import json

connections = [
  ["NOSE", "LEFT_EYE_INNER"],
  ["LEFT_EYE_INNER", "LEFT_EYE"],
  ["LEFT_EYE", "LEFT_EYE_OUTER"],
  ["LEFT_EYE_OUTER", "LEFT_EAR"],
  ["NOSE", "RIGHT_EYE_INNER"],
  ["RIGHT_EYE_INNER", "RIGHT_EYE"],
  ["RIGHT_EYE", "RIGHT_EYE_OUTER"],
  ["RIGHT_EYE_OUTER", "RIGHT_EAR"],
  ["MOUTH_LEFT", "MOUTH_RIGHT"],

  ["LEFT_SHOULDER", "RIGHT_SHOULDER"],
  ["LEFT_SHOULDER", "LEFT_ELBOW"],
  ["LEFT_ELBOW", "LEFT_WRIST"],
  ["LEFT_WRIST", "LEFT_THUMB"],
  ["LEFT_WRIST", "LEFT_INDEX"],
  ["LEFT_PINKY", "LEFT_INDEX"],

  ["RIGHT_SHOULDER", "RIGHT_ELBOW"],
  ["RIGHT_ELBOW", "RIGHT_WRIST"],
  ["RIGHT_WRIST", "RIGHT_THUMB"],
  ["RIGHT_WRIST", "RIGHT_PINKY"],
  ["RIGHT_PINKY", "RIGHT_INDEX"],

  ["LEFT_HIP", "RIGHT_HIP"],
  ["LEFT_SHOULDER", "LEFT_HIP"],
  ["RIGHT_SHOULDER", "RIGHT_HIP"],

  ["LEFT_HIP", "LEFT_KNEE"],
  ["LEFT_KNEE", "LEFT_ANKLE"],
  ["LEFT_ANKLE", "LEFT_HEEL"],
  ["LEFT_HEEL", "LEFT_FOOT_INDEX"],

  ["RIGHT_HIP", "RIGHT_KNEE"],
  ["RIGHT_KNEE", "RIGHT_ANKLE"],
  ["RIGHT_ANKLE", "RIGHT_HEEL"],
  ["RIGHT_HEEL", "RIGHT_FOOT_INDEX"]
]


def create_pose_detector(model_path='pose_landmarker_heavy.task', max_num_poses=3):
    """Create and return a pose detector instance that can detect multiple people."""
    base_options = python.BaseOptions(model_asset_path=model_path, delegate=python.BaseOptions.Delegate.GPU)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        output_segmentation_masks=False,
        num_poses=max_num_poses,
        min_pose_detection_confidence=0.25,
        min_pose_presence_confidence=0.25,
        min_tracking_confidence=0.25
    )
    return vision.PoseLandmarker.create_from_options(options)

def process_image(detector, image):
    """
    Process a single MediaPipe Image (or file-path) and return a list of
    all detected poses, each with its own landmarks.
    """
    # Load image if a path was provided
    if isinstance(image, str):
        image = mp.Image.create_from_file(image)

    result = detector.detect(image)

    # Landmark names
    pose_landmark_names = [lm.name for lm in mp.solutions.pose.PoseLandmark]

    poses = []
    # Iterate over each detected person
    for person_id, landmark_list in enumerate(result.pose_landmarks):
        landmarks = []
        for idx, lm in enumerate(landmark_list):
            landmarks.append({
                'name':       pose_landmark_names[idx],
                'x':          float(lm.x),
                'y':          float(lm.y),
                'z':          float(lm.z),
                'visibility': float(lm.visibility) if hasattr(lm, 'visibility') else None,
                'presence':   float(lm.presence)   if hasattr(lm, 'presence')   else None
            })
        poses.append({
            'person_id': person_id,
            'landmarks': landmarks
        })

    return poses

def process_video(detector, video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video file {video_path}")

    grouped = {
        'data': {},
        'connections': {}
    }

    # Build connections map
    grouped['connections'] = connections

    video_key = os.path.splitext(os.path.basename(video_path))[0]
    grouped['data'][video_key] = {}

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgba = cv2.cvtColor(rgb, cv2.COLOR_RGB2RGBA)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGBA, data=rgba)


        try:
            poses = process_image(detector, mp_image)
            grouped['data'][video_key][f'frame_{frame_idx}.png'] = poses
        except Exception as e:
            print(f"Error on frame {frame_idx}: {e}")
        if frame_idx % 100 == 0:
            print(f"Processing frame {frame_idx}...")
        if frame_idx % 500 == 0:
            # recreate detector to free up memory
            detector.close()
            detector = create_pose_detector(model_path='pose_landmarker_heavy.task', max_num_poses=3)
        frame_idx += 1

    cap.release()
    return grouped

def main():
    parser = argparse.ArgumentParser(
        description='Compute multi-person pose landmarks per frame of an MP4 video'
    )
    parser.add_argument('video_path', help='Path to input .mp4 file')
    parser.add_argument('output_file', nargs='?', default=None, 
                        help='Where to save the JSON results (default: same name as input file with .json extension)')
    parser.add_argument(
        '--model', default='pose_landmarker_heavy.task',
        help='Path to your MediaPipe pose_landmarker_heavy.task file'
    )
    parser.add_argument(
        '--max_poses', type=int, default=3,
        help='Maximum number of people to detect per frame'
    )
    args = parser.parse_args()

    # Generate output filename if not provided
    if args.output_file is None:
        base_name = os.path.splitext(args.video_path)[0]
        args.output_file = f"{base_name}.json"

    if not os.path.exists(args.model):
        print(f"Error: Model file '{args.model}' not found.")
        print("Download it with:")
        print("  wget -O pose_landmarker_heavy.task \\")
        print("    https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task")
        return

    detector = create_pose_detector(args.model, args.max_poses)
    results = process_video(detector, args.video_path)

    with open(args.output_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Results saved to {args.output_file}")

if __name__ == "__main__":
    main()
