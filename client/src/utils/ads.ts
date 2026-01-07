import { randomItem } from '@labrute/core';
import { Lang } from '@labrute/prisma';

export type AdName = string;

export interface AdResult {
  name: string;
  illustration: string;
  url: string | null;
}

// Custom images - no links
const customImages = [
  'Imagen1.jpeg',
  'Imagen2.jpeg',
  'Imagen3.jpeg',
  'Imagen4.jpeg',
  'Imagen5.jpeg',
  'Imagen6.jpeg',
];

// Language parameter kept for compatibility but ignored
export const getRandomAd = (_language: Lang, exclude?: AdName): AdResult => {
  // Filter out the excluded image if provided
  const availableImages = exclude
    ? customImages.filter((img) => img !== exclude)
    : customImages;

  const illustration = randomItem(availableImages);

  return {
    name: illustration,
    illustration,
    url: null,
  };
};

// Keep this for compatibility but it's not used anymore
const ads = {};
export default ads;
