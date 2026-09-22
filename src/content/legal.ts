export type LegalDocId = "mentions" | "confidentialite" | "cgu"

export type LegalDoc = {
  id: LegalDocId
  title: string
  updatedAt: string
  sections: { heading: string; paragraphs: string[] }[]
}

export const LEGAL_LINKS: { id: LegalDocId; label: string }[] = [
  { id: "mentions", label: "Mentions légales" },
  { id: "confidentialite", label: "Confidentialité" },
  { id: "cgu", label: "CGU" },
]

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  mentions: {
    id: "mentions",
    title: "Mentions légales",
    updatedAt: "22 septembre 2026",
    sections: [
      {
        heading: "Éditeur du service",
        paragraphs: [
          "CarbuTarn est une application web éditée par Hexa Décodeur.",
          "Le service permet de consulter les prix des carburants dans le département du Tarn (81), à partir de données publiques et de sources cartographiques libres.",
          "Pour toute question relative au service, l’éditeur peut être contacté à l’adresse : hexadecodeur@gmail.com.",
        ],
      },
      {
        heading: "Directeur de la publication",
        paragraphs: [
          "Le directeur de la publication est Anthony EXARTIER, entrepreneur individuel exploitant sous le nom commercial Hexa Décodeur.",
        ],
      },
      {
        heading: "Hébergement",
        paragraphs: [
          "CarbuTarn est une application web statique. L’hébergement en production dépend du prestataire choisi par l’éditeur lors du déploiement (par exemple un hébergeur cloud ou un fournisseur de pages statiques).",
          "Les coordonnées précises de l’hébergeur seront indiquées ici dès la mise en ligne définitive du service.",
        ],
      },
      {
        heading: "Propriété intellectuelle",
        paragraphs: [
          "L’interface, la marque « CarbuTarn », le logo et les éléments graphiques propres au service sont protégés. Toute reproduction non autorisée est interdite.",
          "Les données de prix des carburants proviennent du jeu de données ouvertes « Prix des carburants en France – Flux instantané – v2 » publié par les services de l’État (data.economie.gouv.fr), sous les conditions de réutilisation applicables à ces données publiques.",
          "Les fonds de carte et certaines informations sur les stations (enseignes, positions) s’appuient sur OpenStreetMap et ses contributeurs (licence ODbL).",
          "Les données de communes proviennent de l’API geo.api.gouv.fr.",
        ],
      },
      {
        heading: "Limitation de responsabilité",
        paragraphs: [
          "CarbuTarn affiche des informations à titre indicatif. Les prix affichés peuvent différer des prix réellement pratiqués en station. L’éditeur ne garantit ni l’exactitude, ni l’exhaustivité, ni la disponibilité continue du service.",
          "L’utilisateur reste seul responsable de ses déplacements et de ses décisions d’achat de carburant.",
        ],
      },
    ],
  },

  confidentialite: {
    id: "confidentialite",
    title: "Politique de confidentialité",
    updatedAt: "22 septembre 2026",
    sections: [
      {
        heading: "Qui est responsable ?",
        paragraphs: [
          "Le responsable du traitement des données éventuellement collectées via CarbuTarn est Anthony EXARTIER, entrepreneur individuel exploitant sous le nom commercial Hexa Décodeur.",
        ],
      },
      {
        heading: "Quelles données sont concernées ?",
        paragraphs: [
          "CarbuTarn est conçue pour minimiser les données personnelles. Dans sa version actuelle :",
          "• Géolocalisation : si tu l’autorises, la position est utilisée uniquement sur ton appareil pour centrer la carte, calculer des distances et proposer un itinéraire. Elle n’est pas envoyée à nos serveurs (il n’existe pas encore de backend applicatif) ni stockée de façon persistante par CarbuTarn.",
          "• Recherche de ville : la saisie est envoyée à l’API publique geo.api.gouv.fr pour obtenir des suggestions de communes du Tarn.",
          "• Données de stations : les prix et adresses sont récupérés depuis data.economie.gouv.fr ; les enseignes et positions peuvent être enrichies via l’API Overpass (OpenStreetMap).",
          "• Stockage local (navigateur) : CarbuTarn peut conserver sur ton appareil des préférences et caches techniques — thème (clair/sombre/système), filtres carburant/tri, largeur du panneau desktop, recherches récentes, et un cache temporaire des enseignes OSM. Ces données restent dans ton navigateur et ne sont pas transmises à Hexa Décodeur.",
          "• Aucun compte utilisateur n’est requis à ce jour. Aucune adresse e-mail, nom ou identifiant n’est collecté par CarbuTarn dans la version actuelle.",
        ],
      },
      {
        heading: "Finalités",
        paragraphs: [
          "Les traitements locaux ou techniques ont pour finalités : afficher la carte et la liste des stations, trier par distance ou par prix, ouvrir un itinéraire vers une station, et améliorer la précision des enseignes/positions.",
        ],
      },
      {
        heading: "Base légale",
        paragraphs: [
          "La géolocalisation repose sur ton consentement (permission du navigateur). Tu peux la refuser : l’application reste utilisable via la recherche de ville et le déplacement manuel de la carte.",
          "L’utilisation des API publiques nécessaires au fonctionnement du service repose sur l’intérêt légitime de fournir le service demandé, dans le respect des conditions d’usage de ces API.",
        ],
      },
      {
        heading: "Cookies et traceurs",
        paragraphs: [
          "CarbuTarn n’utilise pas de cookies publicitaires ni d’outil de mesure d’audience tiers dans sa version actuelle.",
          "Le navigateur peut conserver des données techniques habituelles (cache, préférences système). Aucun bandeau cookies n’est nécessaire tant qu’aucun traceur non exempté n’est déposé.",
        ],
      },
      {
        heading: "Destinataires et sous-traitants",
        paragraphs: [
          "Des fournisseurs tiers peuvent recevoir des requêtes techniques nécessaires au service : data.economie.gouv.fr (prix), Overpass/OpenStreetMap (enseignes et positions), geo.api.gouv.fr (communes), et les services de tuiles OpenStreetMap pour l’affichage de la carte. Ces services appliquent leurs propres politiques.",
          "Lorsque tu cliques sur « Y aller », tu quittes CarbuTarn pour un service de cartographie tiers (Google Maps ou Apple Plans), soumis à leurs conditions.",
        ],
      },
      {
        heading: "Durées de conservation",
        paragraphs: [
          "La position GPS n’est conservée que le temps de la session dans la mémoire de l’application (état React) et disparaît à la fermeture de l’onglet.",
          "Les préférences et caches locaux (thème, filtres, recherches récentes, cache enseignes) restent dans le stockage du navigateur jusqu’à ce que tu les effaces (données du site) ou qu’ils expirent (cache enseignes : 24 h).",
          "Aucune base de données utilisateur n’est opérée par CarbuTarn à ce stade.",
        ],
      },
      {
        heading: "Tes droits (RGPD)",
        paragraphs: [
          "Conformément au RGPD et à la loi Informatique et Libertés, tu disposes d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité, dans les conditions prévues par la loi.",
          "Pour exercer ces droits ou poser une question relative aux données, contacte Hexa Décodeur, éditeur de CarbuTarn.",
          "Tu peux également introduire une réclamation auprès de la CNIL (www.cnil.fr).",
        ],
      },
      {
        heading: "Évolutions (mode participatif)",
        paragraphs: [
          "Une future version pourra permettre de confirmer ou corriger des prix. Cela impliquera un traitement distinct (compte, signalements), documenté et soumis à une mise à jour de la présente politique avant activation.",
        ],
      },
    ],
  },

  cgu: {
    id: "cgu",
    title: "Conditions générales d’utilisation",
    updatedAt: "22 septembre 2026",
    sections: [
      {
        heading: "Objet",
        paragraphs: [
          "Les présentes Conditions Générales d’Utilisation (CGU) régissent l’accès et l’utilisation de l’application web CarbuTarn, éditée par Hexa Décodeur.",
          "En utilisant CarbuTarn, tu acceptes les présentes CGU. Si tu ne les acceptes pas, merci de ne pas utiliser le service.",
        ],
      },
      {
        heading: "Description du service",
        paragraphs: [
          "CarbuTarn permet de visualiser sur une carte et une liste les stations-service du Tarn, leurs prix de carburants issus de données publiques, des informations pratiques (adresse, services, horaires lorsqu’ils sont disponibles), et d’obtenir un itinéraire via un service de cartographie tiers.",
          "Le service est fourni à titre gratuit, en l’état, et peut évoluer, être interrompu ou modifié sans préavis.",
        ],
      },
      {
        heading: "Accès",
        paragraphs: [
          "L’utilisation nécessite un accès Internet et un navigateur compatible. Certaines fonctions (géolocalisation, itinéraire) dépendent des permissions de ton appareil et de services tiers.",
          "L’éditeur ne garantit pas un accès ininterrompu (maintenance, indisponibilité des API publiques, réseau, etc.).",
        ],
      },
      {
        heading: "Données affichées",
        paragraphs: [
          "Les prix « officiels » proviennent des déclarations référencées dans les données ouvertes de l’État. Ils peuvent être incomplets, en retard ou erronés par rapport à la réalité en station.",
          "Les enseignes et positions peuvent être enrichies via OpenStreetMap ; leur exactitude dépend de cette base collaborative.",
          "CarbuTarn ne remplace pas l’affichage légal des prix en station ni un conseil personnalisé.",
        ],
      },
      {
        heading: "Usage autorisé",
        paragraphs: [
          "Tu t’engages à utiliser CarbuTarn de façon loyale et conforme à la loi : consultation personnelle, pas d’attaque technique, pas d’extraction massive abusive des API au détriment de leur disponibilité, pas d’usurpation d’identité.",
          "Toute utilisation commerciale des contenus propres à CarbuTarn (marque, design) sans autorisation est interdite. La réutilisation des données publiques reste soumise aux licences et conditions de leurs producteurs.",
        ],
      },
      {
        heading: "Responsabilité",
        paragraphs: [
          "Dans les limites autorisées par la loi, Hexa Décodeur ne saurait être responsable des dommages indirects, pertes de données, décisions prises sur la base des prix affichés, ou incidents liés à un itinéraire fourni par un tiers.",
          "Tu es responsable de la vérification des prix sur place avant tout paiement.",
        ],
      },
      {
        heading: "Propriété intellectuelle",
        paragraphs: [
          "Sauf mentions contraires (données ouvertes, OSM), les éléments du service appartiennent à Hexa Décodeur ou à ses partenaires. Aucune licence n’est accordée au-delà du droit d’usage personnel du service.",
        ],
      },
      {
        heading: "Modification des CGU",
        paragraphs: [
          "Les CGU peuvent être mises à jour. La date de mise à jour figure en tête du document. L’usage continu du service après modification vaut acceptation des nouvelles conditions, sous réserve des dispositions légales applicables.",
        ],
      },
      {
        heading: "Droit applicable",
        paragraphs: [
          "Les présentes CGU sont soumises au droit français. En cas de litige, et après tentative de résolution amiable, les tribunaux français compétents seront saisis.",
        ],
      },
    ],
  },
}
