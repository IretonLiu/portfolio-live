import numpy as np
import imageio
from scipy.ndimage import convolve
from PIL import Image
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--input", type=str, default="../gebco_08_rev_elev_21600x10800.png")
parser.add_argument("--output", type=str, default="../smooth.png")
parser.add_argument("--scale", type=int, default=100)
parser.add_argument("--smooth", type=bool, default=False)

args = parser.parse_args()
input = args.input
output = args.output
scale = args.scale
smooth = False

Image.MAX_IMAGE_PIXELS = 1000000000
print(f"Read image:{input}")

H = imageio.imread(input).astype(np.float32) / 255.0
print(H.shape, H.dtype)
if smooth:

    # flatten to single channel
    if H.ndim == 3:
        H = H[..., 0]

    # Sobel kernels
    Gx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=float)
    Gy = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=float)

    # Gaussian smoothing kernel
    G = np.array([[1, 2, 1], [2, 4, 2], [1, 2, 1]], dtype=float)
    G /= G.sum()  # normalize

    p_smoothed = convolve(H, G, mode="wrap")
    p_smoothed = (p_smoothed * 255).astype(np.uint8)
    # resize to half resolution
    p_smoothed = np.array(Image.fromarray(p_smoothed).resize((H.shape[1] // scale, H.shape[0] // scale), Image.Resampling.LANCZOS))


    imageio.imwrite(output, p_smoothed)
else:
    print(f"Resize image:{input} to scale 1/{scale}") 


    # resize to 3 channel
    resized = np.array(Image.fromarray((H * 255).astype(np.uint8)).resize((H.shape[1] // scale, H.shape[0] // scale), Image.Resampling.LANCZOS))
    print(resized.shape, resized.dtype)
    imageio.imwrite(output, resized)
