import imageio.v3 as iio
import numpy as np
from PIL import Image




# loads the earth texture image and deterimine the 4 main colours
def get_earth_colours(image, num_colours=8):

    # Reshape the image to be a list of pixels
    pixels = image.reshape(-1, 3)

    # Use k-means clustering to find the main colours
    from sklearn.cluster import KMeans
    kmeans = KMeans(n_clusters=num_colours)
    kmeans.fit(pixels)

    # Get the cluster centres (the main colours)
    colours = kmeans.cluster_centers_.astype(int)

    return colours

if __name__ == "__main__":
    # parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description='Get the main colours of an image.')
    parser.add_argument('image', type=str, help='Path to the image file.')
    args = parser.parse_args()
    
    image_path = args.image
    Image.MAX_IMAGE_PIXELS = None  # Disable DecompressionBombErrorc
    image = iio.imread(image_path)

    # downsize the image for faster processing

    image = Image.fromarray(image)
    image = image.resize((image.width // 4, image.height // 4), Image.Resampling.LANCZOS)
    import numpy as np
    
    image = np.array(image)

    # apply smoothing to reduce noise
    from scipy.ndimage import gaussian_filter
    # rgb smooting
    image = gaussian_filter(image, sigma=(1, 1, 0))
    



    colours = get_earth_colours(image)

    # generate a new image showing the 4 colours
    w = image.shape[1] // 4
    h = image.shape[0] // 4
    recoloured = np.zeros((h, w, 3), dtype=np.uint8)
    for i in range(h):
        for j in range(w):
            pixel = image[i*4, j*4]
            distances = np.linalg.norm(colours - pixel, axis=1)
            closest_colour = np.argmin(distances)
            recoloured[i, j] = colours[closest_colour]  
    iio.imwrite('recoloured.png', recoloured)



