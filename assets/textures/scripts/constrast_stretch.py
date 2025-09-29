# constrast_stretch.py
import numpy as np
import imageio.v3 as iio
import matplotlib.pyplot as plt

def contrast_stretch(image):
    # Convert to grayscale if the image is in color
    gray_image = image

    # Find the minimum and maximum pixel values
    min_val = np.min(gray_image)
    max_val = np.max(gray_image)

    # Apply contrast stretching formula
    stretched = (gray_image - min_val) * (255 / (max_val - min_val))
    stretched = np.clip(stretched, 0, 255).astype(np.uint8)

    return stretched

# Load the image
image = iio.imread('displacement_scaled.png')
stretched_image = contrast_stretch(image)

fig, ax = plt.subplots(1, 2, figsize=(12, 6))
ax[0].imshow(image, cmap='gray')
ax[0].set_title('Original Image')
ax[0].axis('off')
ax[1].imshow(stretched_image, cmap='gray')
ax[1].set_title('Contrast Stretched Image')
ax[1].axis('off')
plt.show()

