import imageio.v3 as imageio
from PIL import Image
import numpy as np
Image.MAX_IMAGE_PIXELS = None  # Disable DecompressionBombError



bathymetry = imageio.imread("bath.png")/255.0
topography = imageio.imread("elev.png")/255.0
mask = topography > 0.0


displacement = np.zeros(bathymetry.shape[0:2], dtype=np.float32)
displacement[mask] = topography[mask]
displacement[~mask] = bathymetry[~mask] - 1.0

# remap to 0-1
sea_level = (0.0 - displacement.min()) / (displacement.max() - displacement.min())
displacement = (displacement - displacement.min()) / (displacement.max() - displacement.min())
print(f"sea level: {sea_level}")



# calculate normal map
def compute_normal_map(displacement, strength=1.0):
    from scipy.ndimage import gaussian_filter, sobel
    import numpy as np

    # Smooth the displacement map to reduce noise
    smoothed = gaussian_filter(displacement, sigma=1)

    # Compute gradients using Sobel filter
    dx = sobel(smoothed, axis=1)
    dy = sobel(smoothed, axis=0)

    # Compute normal vectors
    dz = np.ones_like(smoothed) * (1.0 / strength)
    normals = np.stack((dx, dy, dz), axis=-1)

    # Normalize the normal vectors
    norm = np.linalg.norm(normals, axis=-1, keepdims=True)
    normals /= norm

    # Convert to RGB format
    normal_map = (normals + 1) / 2 * 255
    normal_map = normal_map.astype(np.uint8)

    return normal_map

# normal_map = compute_normal_map(displacement, strength=0.5)
displacement = np.log(displacement+1.0)*1.5
imageio.imwrite("displacement.png", (displacement * 255).astype('uint8'))
# imageio.imwrite("normal_map.png", normal_map)






