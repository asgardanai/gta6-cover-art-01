// Colour grades: each grade tints the photos with a canvas filter plus one or
// two gradient overlays drawn over the panel in a blend mode. Overlays use
// normalised coordinates (0..1 across the panel) so they work at any size.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.35) contrast(1.06) brightness(1.02)',
    overlays: [
      {
        blend: 'overlay',
        from: [0, 0],
        to: [0, 1],
        stops: [
          [0, 'rgba(255, 150, 60, 0.22)'],
          [1, 'rgba(190, 30, 110, 0.40)'],
        ],
      },
    ],
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.45) contrast(1.08)',
    overlays: [
      {
        blend: 'soft-light',
        from: [0, 0],
        to: [1, 0],
        stops: [
          [0, 'rgba(0, 220, 200, 0.45)'],
          [1, 'rgba(255, 40, 160, 0.45)'],
        ],
      },
      {
        blend: 'multiply',
        from: [0, 0],
        to: [0, 1],
        stops: [
          [0, 'rgba(8, 8, 40, 0.35)'],
          [1, 'rgba(8, 8, 40, 0)'],
        ],
      },
    ],
  },
  gold: {
    label: 'Palm Gold',
    filter: 'sepia(0.28) saturate(1.35) contrast(1.04)',
    overlays: [
      {
        blend: 'soft-light',
        from: [0, 0],
        to: [0, 1],
        stops: [
          [0, 'rgba(255, 205, 90, 0.30)'],
          [1, 'rgba(120, 60, 0, 0.35)'],
        ],
      },
    ],
  },
  tealheat: {
    label: 'Teal Heat',
    filter: 'saturate(1.25) contrast(1.07)',
    overlays: [
      {
        blend: 'color',
        from: [0, 0],
        to: [0, 1],
        stops: [
          [0, 'rgba(0, 180, 180, 0.45)'],
          [1, 'rgba(255, 120, 40, 0.45)'],
        ],
      },
    ],
  },
  noir: {
    label: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.18) brightness(1.03)',
    overlays: [
      {
        blend: 'overlay',
        from: [0, 0],
        to: [0, 1],
        stops: [
          [0, 'rgba(255, 240, 220, 0.14)'],
          [1, 'rgba(10, 10, 20, 0.32)'],
        ],
      },
    ],
  },
};

export const GRADE_IDS = Object.keys(GRADES);
