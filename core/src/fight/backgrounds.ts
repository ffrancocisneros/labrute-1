export type FightBackground = {
  name: string,
  odds: number,
};

export const tournamentBackground = {
  name: 'torneo.jpg',
  odds: 0,
};

export const bossBackground = {
  name: 'boss.jpeg',
  odds: 0,
};

export const fightBackgrounds: FightBackground[] = [
  { name: 'Arena1.jpeg', odds: 10 },
  { name: 'arena2.JPG', odds: 10 },
  { name: 'arena3.JPG', odds: 10 },
  { name: 'arena4.JPG', odds: 10 },
  { name: 'Arena5.png', odds: 10 },
  { name: 'Arena6.png', odds: 10 },
  { name: 'Arena7.png', odds: 10 },
  { name: 'Arena8.png', odds: 10 },
  { name: 'Arena9.jpg', odds: 10 },
  { name: 'Arena10.png', odds: 10 },
  tournamentBackground,
  bossBackground,
];
