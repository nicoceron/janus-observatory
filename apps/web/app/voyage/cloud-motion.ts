/** Art-directed weather layers, shared by the live scene and editable Blender previews. */
export function cloudPose(index: number, seconds: number, radius = 1) {
  const longitude = [-0.8, 0.82, 2.65, -2.25, 0.12][index] + seconds * (0.008 + index * 0.0007);
  const latitude = [0.32, -0.28, 0.5, -0.48, 0.97][index];
  // Low enough to read as weather over the land, high enough to clear ordinary roofs.
  const altitude = radius * (1.19 + (index % 2) * 0.03);
  return {
    position: [
      Math.sin(longitude) * Math.cos(latitude) * altitude,
      Math.sin(latitude) * altitude,
      Math.cos(longitude) * Math.cos(latitude) * altitude,
    ],
    yaw: 0.25 + index * 0.43,
    scale: radius * [1.2, 0.93, 1.05, 0.88, 0.78][index],
  };
}
