/** Diagnostics do not need to invalidate the DOM when their value has not changed. */
export function canvasMetadata(canvas: HTMLCanvasElement, name: string, value: string) {
  if (canvas.getAttribute(name) !== value) canvas.setAttribute(name, value);
}
