import manifest from "./images.json";

export interface ImageEntry { widths: number[]; aspect: number }
export const IMAGES = manifest as Record<string, ImageEntry>;
