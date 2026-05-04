// ============================================================
//  REGISTRY DES PERSONNAGES
//  Pour ajouter un perso :
//    1. Créer public/character/<id>/
//    2. Mettre dedans :
//         <id>-front.png          → image statique face
//         <id>-allframe-right.png → spritesheet animation droite
//         <id>-right-frame1.png   (optionnel, frames individuelles)
//         <id>-right-frame2.png
//         <id>-right-frame3.png
//    3. Ajouter une entrée dans CHARACTERS ci-dessous
// ============================================================

export interface CharacterConfig {
  id: string;
  name: string;
  // Chemins des assets (tous dans /public/character/<id>/)
  assets: {
    front: string;          // image face / idle
    spritesheetRight: string; // spritesheet pour l'animation marche
  };
  // Config de la spritesheet
  spritesheet: {
    frameWidth: number;
    frameHeight: number;
    walkFrames: { start: number; end: number }; // frames dans la spritesheet
    frameRate: number;
  };
}

export const CHARACTERS: CharacterConfig[] = [
  {
    id: 'nass',
    name: 'Nass',
    assets: {
      front: '/character/nass/nass-front.png',
      spritesheetRight: '/character/nass/nass-allframe-right.png',
    },
    spritesheet: {
      frameWidth: 1760,
      frameHeight: 2412,
      walkFrames: { start: 2, end: 0 },
      frameRate: 4,
    },
  },

  // Exemple perso 2 — décommenter et remplir quand les assets sont prêts
  // {
  //   id: 'perso2',
  //   name: 'Perso 2',
  //   assets: {
  //     front: '/character/perso2/perso2-front.png',
  //     spritesheetRight: '/character/perso2/perso2-allframe-right.png',
  //   },
  //   spritesheet: {
  //     frameWidth: 0,   // à remplir
  //     frameHeight: 0,
  //     walkFrames: { start: 2, end: 0 },
  //     frameRate: 4,
  //   },
  // },

  // Exemple perso 3
  // {
  //   id: 'perso3',
  //   name: 'Perso 3',
  //   assets: {
  //     front: '/character/perso3/perso3-front.png',
  //     spritesheetRight: '/character/perso3/perso3-allframe-right.png',
  //   },
  //   spritesheet: {
  //     frameWidth: 0,
  //     frameHeight: 0,
  //     walkFrames: { start: 2, end: 0 },
  //     frameRate: 4,
  //   },
  // },
];

// Accès rapide par id
export const getCharacter = (id: string): CharacterConfig | undefined =>
  CHARACTERS.find((c) => c.id === id);

// Personnage par défaut (le premier de la liste)
export const DEFAULT_CHARACTER = CHARACTERS[0];
