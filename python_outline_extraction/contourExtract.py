import sys
import cv2 #via pip install opencv-python
import numpy as np
import fitCurves
import os
import json


debug = False
drawContours = False

def cubic_bezier_curve(P0, P1, P2, P3, t):
    """Compute a point on a cubic Bézier curve for parameter t."""
    return (1 - t)**3 * P0 + 3 * (1 - t)**2 * t * P1 + 3 * (1 - t) * t**2 * P2 + t**3 * P3

def draw_bezier_curve(image, control_points, color=(255, 0, 0), thickness=5):
    """
    Draws cubic Bézier curves on an image.
    
    Parameters:
        image: The output image.
        control_points: A NumPy array of shape (N, 4, 2) containing control points.
        color: The color of the curve.
        thickness: The thickness of the curve.
    """
    for curve in control_points:
        P0, P1, P2, P3 = curve
        # Generate points along the Bézier curve
        bezier_points = np.array([cubic_bezier_curve(P0, P1, P2, P3, t) for t in np.linspace(0, 1, 100)], dtype=np.int32)
        
        # Draw the curve by connecting consecutive points
        for i in range(len(bezier_points) - 1):
            cv2.line(image, tuple(bezier_points[i]), tuple(bezier_points[i + 1]), color, thickness)

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
      # print("contour length", len(c))
      if len(c) > len(target_contour):
        target_contour = c

    #convert Sequence[MatLike] into a numpy array of shape (N, 2), reshaping if necessary
    pointList = np.array(target_contour).reshape((-1, 2))

    #print shape of pointList

    curves = fitCurves.fitCurve(pointList, 4)

    if drawContours:
      output = np.zeros_like(binary_mask)
      cv2.drawContours(output, [target_contour], -1, (255), thickness=1)
      draw_bezier_curve(output, curves)

      # Save or display the result
      cv2.imwrite("contours.png", output)
    # print(curves[0][0])

    curveJsonList = []

    weirdCurveCount = 0
    if debug:
      print("num curves in frame: ",len(curves), "for image", image_path)
    else:
      #convert (N, 4, 2) list into json of  [[x1,y1,x2,y2,x3,y3,x4,y4]]
      for c in range(len(curves)):
          curve = curves[c]
          try:
            curveJson = []
            for point in curve:
              #convert numpy int32 into python int
              curveJson.append(int(point[0]))
              curveJson.append(int(point[1]))
            curveJsonList.append(curveJson)
          except Exception as e:
            # create a new curve that starts at the and of the last curve, and ends at the start of the next curve
            lastCurveStart = curves[c-1][-1]
            nextCurveEnd = curves[c+1 % len(curves)][0]
            # linspace to create 4 points
            newCurve = np.linspace(lastCurveStart, nextCurveEnd, 4)
            for point in newCurve:
              curveJsonList.append(int(point[0]))
              curveJsonList.append(int(point[1]))
            # print("replacing curve", curves[c], "with new curve", newCurve)
            weirdCurveCount += 1


    # if there are too many weird curves, return an empty list
    if weirdCurveCount > 5:
      return []
    else:
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
    contour = extract_contours(full_image_path)
    if len(contour) > 0:
      contourList.append(contour)
    else:
      print("no contour found or error for", full_image_path)
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
  #  #get video folder from cmd line arg
  videos_folder_path = sys.argv[1]
  all_video_contours = extract_contours_from_folder_of_videos(videos_folder_path)
  json.dump(all_video_contours, open("all_video_contours.json", "w"))

  # # has error with fitCurve() max error = 1
  # test_path = 'vids/MUTEK_raw/short_540/kurush_540/00025.png'
  # print("frame points",extract_contours(test_path))







# Draw contours or save them as vectors
# output = np.zeros_like(binary_mask)
# cv2.drawContours(output, contours, -1, (255), thickness=1)


# Save or display the result
# cv2.imwrite("contours.png", output)
