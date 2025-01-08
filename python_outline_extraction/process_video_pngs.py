import os
import subprocess
from pngs_to_skeleton import compute_skeletons_for_folder_of_videos
from contourExtract import extract_contours_from_folder_of_videos
import json

def scale_pngs(input_root, output_root):
    # Iterate over all subdirectories in the input root directory
    for subdir in os.listdir(input_root):
        subdir_path = os.path.join(input_root, subdir)
        if os.path.isdir(subdir_path):
            # Create the corresponding output subdirectory
            output_subdir_path = os.path.join(output_root, subdir)
            os.makedirs(output_subdir_path, exist_ok=True)

            # Construct the ffmpeg command
            input_pattern = os.path.join(subdir_path, "*.png")
            output_pattern = os.path.join(output_subdir_path, "%05d.png")
            command = [
                "ffmpeg",
                "-pattern_type", "glob",
                "-i", input_pattern,
                "-vf", "scale=960:540",
                output_pattern
            ]

            # Run the ffmpeg command
            print(f"Processing {subdir_path} -> {output_subdir_path}")
            try:
                subprocess.run(command, check=True)
            except subprocess.CalledProcessError as e:
                print(f"Error processing {subdir}: {e}")

def compress_textures(target_dir):
    # Iterate over all subdirectories in the target directory
    for subdir in os.listdir(target_dir):
        subdir_path = os.path.join(target_dir, subdir)
        if os.path.isdir(subdir_path):
            # Count total number of files in the directory
            num_files = len([f for f in os.listdir(subdir_path) if os.path.isfile(os.path.join(subdir_path, f))])

            if num_files > 0:
                print(f"Processing {subdir_path} with {num_files} files...")

                # Assemble the command
                cmd = [
                    "basisu",
                    "-uastc", "-ktx2", "-tex_array",
                    "-multifile_printf", os.path.join(subdir_path, "%05u.png"),
                    "-multifile_first", "1",
                    "-multifile_num", str(num_files),
                    "-output_file", f"{subdir_path}_texture_array.ktx2"
                ]

                # Print the command for debugging
                print(f"Executing command: {' '.join(cmd)}")

                # Run the command
                try:
                    subprocess.run(cmd, check=True)
                except subprocess.CalledProcessError as e:
                    print(f"Error processing {subdir}: {e}")
            else:
                print(f"No files found in {subdir_path}")

def extract_skeletons(output_root):
    print("Extracting skeletons...")
    output_file = os.path.join(output_root, "skeletons.json")
    results = compute_skeletons_for_folder_of_videos(output_root, True, output_file)
    try:
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Skeletons saved to {output_file}")
    except Exception as e:
        print(f"Error saving skeletons: {e}")

def extract_contours(output_root):
    print("Extracting contours...")
    all_video_contours = extract_contours_from_folder_of_videos(output_root)
    output_file = os.path.join(output_root, "all_video_contours.json")
    with open(output_file, "w") as f:
        json.dump(all_video_contours, f, indent=2)
    print(f"Contours saved to {output_file}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Scale PNGs, compress textures, extract skeletons, and contours.")
    parser.add_argument("input_root", help="Path to the root input directory containing subdirectories of PNGs.")
    parser.add_argument("output_root", help="Path to the root output directory where scaled images will be saved.")

    args = parser.parse_args()

    input_root_directory = args.input_root
    output_root_directory = args.output_root

    scale_pngs(input_root_directory, output_root_directory)
    compress_textures(output_root_directory)
    extract_skeletons(output_root_directory)
    extract_contours(output_root_directory)
