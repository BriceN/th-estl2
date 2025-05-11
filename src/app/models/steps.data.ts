import { Step } from './step.model';

export const steps: Step[] = [
  {
    id: 1,
    year: 1995,
    title: 'Il était une fois...',
    coordinates: { lat: 49.25631, lng: 4.03994 },
    hint: "Notre pèlerinage commence là où notre fil vital s'est noué un mois avant l'heure, dans ce havre de nouveaux départs baptisé du nom d'un apôtre",
    lockedImage:
      'https://www.amisdejesus.net/wp-content/uploads/2017/02/saint-andre.jpg',
    unlockedContent: 'Félicitations pour avoir trouvé le premier lieu !',
    cassette: '1.ogg',
    isUnlocked: false,
    isAccessible: true,
    isCurrent: true,
    canPostpone: false,
  },
  {
    id: 2,
    title: 'Constance est mère de sureté',
    coordinates: { lat: 49.259205055989895, lng: 4.0359924197744945 },
    hint: 'Entre les vieux chênes, un passage se révèle',
    lockedImage:
      'https://images.unsplash.com/photo-1511497584788-876760111969?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    unlockedContent:
      "Vous avez découvert le passage caché ! Il est temps de s'aventurer plus profondément.",
    unlockedImage:
      'https://images.unsplash.com/photo-1507501336603-6e31db2be093?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    isUnlocked: false,
    isAccessible: false,
    isCurrent: false,
    year: 1999,
    cassette: 'sample.mp3',
    canPostpone: true,
  },
  {
    id: 3,
    title: 'Le pot pourri',
    coordinates: { lat: 49.2599726573367, lng: 4.031611159574977 },
    hint: "Là où l'eau rencontre la pierre, l'artefact attend",
    lockedImage:
      'https://images.unsplash.com/photo-1519677584237-752f8853252e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    lockedVideo:
      'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    unlockedContent:
      "L'ancien artefact est à vous ! Vous avez terminé la chasse au trésor.",
    unlockedImage:
      'https://images.unsplash.com/photo-1531873568041-086189c151da?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    unlockedVideo:
      'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    isUnlocked: false,
    isAccessible: false,
    isCurrent: false,
    year: 2007,
    cassette: 'sample.mp3',
    canPostpone: false,
  },

  {
    id: 4,
    year: 2001,
    title: 'Une étape supplémentaire',
    coordinates: { lat: 49.25, lng: 4.03 },
    hint: "Un indice pour l'étape 4.",
    unlockedContent: "Contenu débloqué de l'étape 4.",
    cassette: 'sample.mp3',
    isUnlocked: false,
    isAccessible: false,
    isCurrent: false,
    canPostpone: false,
  },
];
