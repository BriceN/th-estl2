export const steps = [
  {
    id: 1,
    title: 'Bout de la rue',
    subtitle: 'Commencez au point de départ',
    coordinates: { lat: 49.2589210827042, lng: 4.037472846877561 },
    hint: 'Cherchez la statue qui porte le monde sur ses épaules',
    lockedImage:
      'https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    unlockedContent:
      'Félicitations pour avoir trouvé le premier indice ! Votre prochaine destination vous attend.',
    unlockedImage:
      'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    isUnlocked: false,
    isAccessible: true,
    isCurrent: true,
  },
  {
    id: 2,
    title: 'Jean 23',
    subtitle: 'Trouvez le passage secret',
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
  },
  {
    id: 3,
    title: 'Marché',
    subtitle: 'Découvrez le trésor perdu',
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
  },
];
