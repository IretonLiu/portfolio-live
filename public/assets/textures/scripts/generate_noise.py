import numpy as np
from noise import pnoise2, pnoise3
import matplotlib.pyplot as plt

from scipy.spatial import cKDTree

# Goal: Generate 3D layered Worley noise and perlin-worley noise for clouds based 

# the 2D Worley noise implementation, each grid cell contains a random point, and the noise value at each pixel is determined by the distance to the nearest point.
def worley_noise_2d(shape, frequency):
    # Generate random points in the grid
    grid_size = (shape[0] // frequency, shape[1] // frequency)
    points = np.random.rand(grid_size[0], grid_size[1], 2) * frequency
    points += np.indices(grid_size).transpose(1, 2, 0) * frequency
    points = points.reshape(-1, 2)

    # Create a KDTree for fast nearest neighbor search
    tree = cKDTree(points)

    # Generate the noise map
    noise_map = np.zeros(shape)
    for i in range(shape[0]):
        for j in range(shape[1]):
            dist, _ = tree.query([i, j], k=1)
            noise_map[i, j] = dist

    # Normalize the noise map to [0, 1]
    noise_map = (noise_map - noise_map.min()) / (noise_map.max() - noise_map.min())
    return noise_map


def worley_noise_3d(shape, frequency):
    # Generate random points in the grid
    grid_size = (shape[0] // frequency, shape[1] // frequency, shape[2] // frequency)
    points = np.random.rand(grid_size[0], grid_size[1], grid_size[2], 3) * frequency
    points += np.indices(grid_size).transpose(1, 2, 3, 0) * frequency
    points = points.reshape(-1, 3)

    # Create a KDTree for fast nearest neighbor search
    tree = cKDTree(points)

    # Generate the noise map
    noise_map = np.zeros(shape)
    for i in range(shape[0]):
        for j in range(shape[1]):
            for k in range(shape[2]):
                dist, _ = tree.query([i, j, k], k=1)
                noise_map[i, j, k] = dist

    # Normalize the noise map to [0, 1]
    noise_map = (noise_map - noise_map.min()) / (noise_map.max() - noise_map.min())
    return 1- noise_map


def perlin_noise_3d(shape, scale, octaves=1, persistence=0.5, lacunarity=2.0):
    noise_map = np.zeros(shape)
    # tileable noise
    for i in range(shape[0]):
        for j in range(shape[1]):
            for k in range(shape[2]):
                noise_map[i, j, k] = pnoise3(i / scale,
                                                   j / scale,
                                                   k / scale,
                                                   octaves=octaves,
                                                   persistence=persistence,
                                                   lacunarity=lacunarity,
                                                   repeatx=shape[0],
                                                   repeaty=shape[1],
                                                   repeatz=shape[2],
                                                   base=0)
    # Normalize the noise map to [0, 1]
    noise_map = (noise_map - noise_map.min()) / (noise_map.max() - noise_map.min())
    return noise_map

def perlin_noise_2d(shape, octaves=1, persistence=0.5, lacunarity=2.0):
    height, width = shape
    # tileable noise
    noise_array = np.zeros((height, width))
    for y in range(height):
        for x in range(width):
            # Map pixel coords into noise coords [0, width] and [0, height]
            nx = x / width
            ny = y / height
            noise_value = pnoise2(
                nx * width, ny * height,
                octaves=octaves,
                persistence=persistence,
                lacunarity=lacunarity,
                repeatx=width,   # noise repeats every "width"
                repeaty=height,  # noise repeats every "height"
                base=0
            )
            # Normalize [-1,1] -> [0,1]
            noise_array[y][x] = noise_value
    return noise_array
def main():


    perlin_2d = perlin_noise_2d((256, 256), octaves=6)
    image = np.concatenate((perlin_2d, perlin_2d), axis=1)
    plt.imshow(image, cmap='gray')
    plt.colorbar()
    plt.title('Perlin Noise 2D')
    plt.show()
    # put 2 next to each other to see if they blend well
    worley_3d = worley_noise_3d((128, 128, 128), frequency=16)
    noise_map = worley_noise_2d((256, 256), frequency=32)

    frequencies = [4, 8, 16]
    for freq in frequencies:
        worley_3d = worley_noise_3d((128, 128, 128), frequency=freq)
        # save as .bin file
        worley_3d.tofile(f'worley_3d_freq_{freq}.bin')


    # Print the noise map shape
    print("Worley Noise Map Shape:", noise_map.shape)

if __name__ == "__main__":
    main()
