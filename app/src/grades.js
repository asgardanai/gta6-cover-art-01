// Colour grades: each grade tints the photos with a canvas filter plus one or
// two gradient overlays drawn over the panel in a blend mode. Overlays use
// normalised coordinates (0..1 across the panel) so they work at any size.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.55) contrast(1.14) brightness(1.03)',
    overlays: [
      {
        blend: 'overlay',
        from: [0, 0],
        to: [0, 1],
        stops: [
          [0, 'rgba(255, 140, 50, 0.32)'],
          [1, 'rgba(200, 20, 120, 0.54)'],
        ],
      },
      {
        blend: 'soft-light',
        from: [0, 0],
        to: [1, 0],
        stops: [
          [0, 'rgba(255, 120, 40, 0.28)'],
          [1, 'rgba(255, 40, 120, 0.28)'],
        ],
      },
    ],
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.65) contrast(1.12) brightness(1.01)',
    overlays: [
      {
        blend: 'overlay',
        from: [0, 0],
        to: [1, 0],
        stops: [
          [0, 'rgba(0, 220, 200, 0.5)'],
          [1, 'rgba(255, 40, 160, 0.5)'],
        ],
      },
      {
        blend: 'multiply',
        from: [0, 0],
        to: [0, 1],
        stops: [
          [0, 'rgba(8, 8, 40, 0.42)'],
          [1, 'rgba(8, 8, 40, 0)'],
        ],
      },
    ],
  },
  gold: {
    label: 'Palm Gold',
    filter: 'sepia(0.35) saturate(1.5) contrast(1.08) brightness(1.02)',
    overlays: [
      {
        blend: 'soft-light',
        from: [0, 0],
        to: [0, 1],
        stops: [
          [0, 'rgba(255, 205, 90, 0.4)'],
          [1, 'rgba(120, 60, 0, 0.44)'],
        ],
      },
    ],
  },
  tealheat: {
    label: 'Teal Heat',
    filter: 'saturate(1.45) contrast(1.12) brightness(1.01)',
    overlays: [
      {
        blend: 'color',
        from: [0, 0],
        to: [0, 1],
        stops: [
          [0, 'rgba(0, 180, 180, 0.58)'],
          [1, 'rgba(255, 120, 40, 0.58)'],
        ],
      },
    ],
  },
  noir: {
    label: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.22) brightness(1.04)',
    overlays: [
      {
        blend: 'overlay',
        from: [0, 0],
        to: [0, 1],
        stops: [
          [0, 'rgba(255, 240, 220, 0.16)'],
          [1, 'rgba(10, 10, 20, 0.36)'],
        ],
      },
    ],
  },
};

export const GRADE_IDS = Object.keys(GRADES);
