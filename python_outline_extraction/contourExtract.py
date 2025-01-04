import sys
import cv2 #via pip install opencv-python
import numpy as np
import fitCurves
import os
import json


def extract_contours(image_path):
  try:
    # Load the image
    image = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)

    # Extract the alpha channel
    alpha_channel = image[:, :, 3]

    # Threshold the alpha channel to create a binary mask
    _, binary_mask = cv2.threshold(alpha_channel, 127, 255, cv2.THRESH_BINARY)

    # Find contours
    contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    #find the longest contour since thats probably what we want
    target_contour = contours[0]
    for c in contours:
      if len(c) > len(target_contour):
        target_contour = c

    #convert Sequence[MatLike] into a numpy array of shape (N, 2), reshaping if necessary
    pointList = np.array(contours[0]).reshape((-1, 2))

    #print shape of pointList

    curves = fitCurves.fitCurve(pointList, 1)
    # print(curves[0][0])

    #convert (N, 4, 2) list into json of  [[{x,y}]]
    curveJsonList = []
    for curve in curves:
        curveJson = []
        for point in curve:
            #convert numpy int32 into python int
            curveJson.append({"x": int(point[0]), "y": int(point[1])})
        curveJsonList.append(curveJson)
    return curveJsonList
  except Exception as e:
    print("error in extract_contours", image_path)
    print(e)
    return []


def extract_contours_from_video_folder(video_folder_path):
  contourList = []
  for image_path in os.listdir(video_folder_path):
    # print(image_path)
    full_image_path = os.path.join(video_folder_path, image_path)
    contourList.append(extract_contours(full_image_path))
  return {"frames": contourList}


def extract_contours_from_folder_of_videos(folder_path):
  all_video_contours = {}
  for video_path in os.listdir(folder_path):
    print("starting",video_path)
    video_folder_path = os.path.join(folder_path, video_path)
    video_contours = extract_contours_from_video_folder(video_folder_path)
    all_video_contours[video_path] = video_contours
    print(video_path, "finished with num frames", len(video_contours['frames']))
  return all_video_contours


if __name__ == "__main__":
  #get video folder from cmd line arg
  videos_folder_path = sys.argv[1]
  all_video_contours = extract_contours_from_folder_of_videos(videos_folder_path)
  json.dump(all_video_contours, open("all_video_contours.json", "w"))

  # test_path = 'vids/MUTEK_raw/short_540/kurush_540/00042.png'
  # print(extract_contours(test_path))

# Draw contours or save them as vectors
# output = np.zeros_like(binary_mask)
# cv2.drawContours(output, contours, -1, (255), thickness=1)


# Save or display the result
# cv2.imwrite("contours.png", output)
