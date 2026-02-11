import imageio

# read in an original image
original_image = imageio.imread("displacement.png")


# if the colour is  a sky blue, or close to it, the we want 200 otherwise we want 255
def is_sea(original, threshold=120):
    if original < threshold:
        return True

    return False


thresholds = [155]
for threshold in thresholds:
    # create a depth image of the same size as the original image
    depth_image = original_image.copy()
    is_sea_image = original_image < threshold
    depth_image[is_sea_image] = 60


# save the depth image as a png
imageio.imwrite("depth_image.png", depth_image)
