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

const UPDATED_AT = "23 septembre 2026"

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  mentions: {
    id: "mentions",
    title: "Mentions légales",
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Éditeur du service",
        paragraphs: [
          "CarbuTarn est une application web éditée par Hexa Décodeur.",
          "Le service permet de consulter les prix des carburants dans le département du Tarn (81), à partir de données publiques, de sources cartographiques libres, et de signalements d’utilisateurs (prix constatés).",
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
          "Le site et l’API sont hébergés par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (https://vercel.com).",
          "Le service est accessible notamment via carbutarn.vercel.app, ainsi que via tout nom de domaine que l’éditeur y associerait.",
          "La base de données applicative est fournie par Neon (infrastructure cloud ; traitement technique sous-traité). L’envoi des e-mails de connexion (lien magique) est assuré par Resend.",
        ],
      },
      {
        heading: "Propriété intellectuelle",
        paragraphs: [
          "L’interface, la marque « CarbuTarn », le logo et les éléments graphiques propres au service sont protégés. Toute reproduction non autorisée est interdite.",
          "Les données de prix officiels des carburants proviennent du jeu de données ouvertes « Prix des carburants en France – Flux instantané – v2 » publié par les services de l’État (data.economie.gouv.fr), sous les conditions de réutilisation applicables à ces données publiques.",
          "Les fonds de carte et certaines informations sur les stations (enseignes, positions) s’appuient sur OpenStreetMap et ses contributeurs (licence ODbL).",
          "Les données de communes proviennent de l’API geo.api.gouv.fr.",
          "Les « prix constatés » affichés résultent d’un calcul de consensus à partir de signalements d’utilisateurs ; ils ne constituent pas une donnée officielle de l’État.",
        ],
      },
      {
        heading: "Limitation de responsabilité",
        paragraphs: [
          "CarbuTarn affiche des informations à titre indicatif. Les prix officiels comme les prix constatés peuvent différer des prix réellement pratiqués en station. L’éditeur ne garantit ni l’exactitude, ni l’exhaustivité, ni la disponibilité continue du service.",
          "L’utilisateur reste seul responsable de ses déplacements et de ses décisions d’achat de carburant. Les prix affichés en station prévalent toujours.",
        ],
      },
    ],
  },

  confidentialite: {
    id: "confidentialite",
    title: "Politique de confidentialité",
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Qui est responsable ?",
        paragraphs: [
          "Le responsable du traitement des données personnelles collectées via CarbuTarn est Anthony EXARTIER, entrepreneur individuel exploitant sous le nom commercial Hexa Décodeur.",
          "Contact : hexadecodeur@gmail.com.",
        ],
      },
      {
        heading: "Quelles données sont concernées ?",
        paragraphs: [
          "CarbuTarn vise à minimiser les données personnelles. Selon votre usage :",
          "• Compte utilisateur : adresse e-mail utilisée pour recevoir un lien magique de connexion ; identifiant technique de compte stocké en base.",
          "• Session : un cookie HttpOnly nommé carbutarn_session (durée d’environ 7 jours) permet de vous reconnaître après connexion. Il est strictement nécessaire au fonctionnement du compte. La déconnexion invalide les sessions côté serveur.",
          "• Signalements de prix : station, type de carburant, confirmation ou prix proposé, et horodatage. Ces données sont associées à votre compte. Aucune coordonnée GPS n’est envoyée ni stockée lors d’un signalement.",
          "• Géolocalisation côté appareil : si vous l’autorisez pour centrer la carte ou calculer des distances, la position reste en mémoire de session dans le navigateur et n’est pas transmise à nos serveurs.",
          "• Recherche de ville : la saisie est envoyée à l’API CarbuTarn, qui interroge geo.api.gouv.fr côté serveur (votre adresse IP n’est pas exposée directement à ce service).",
          "• Données de stations : les prix officiels et adresses sont récupérés côté serveur depuis data.economie.gouv.fr ; les enseignes peuvent être enrichies via un snapshot OpenStreetMap embarqué (et, en développement uniquement, via Overpass).",
          "• Stockage local (navigateur) : préférences et caches techniques (thème, filtres, largeur du panneau, recherches récentes, cache temporaire des enseignes OSM). Ces éléments restent sur votre appareil.",
          "• Protection anti-robot : si Cloudflare Turnstile est activé, un jeton de défi est envoyé à Cloudflare lors de la demande de lien magique.",
        ],
      },
      {
        heading: "Finalités",
        paragraphs: [
          "Les traitements ont pour finalités : fournir la carte et la liste des stations ; permettre la connexion par lien magique ; enregistrer et agréger les signalements (prix constatés) ; limiter les abus ; améliorer la précision des enseignes et positions ; et assurer la sécurité et le bon fonctionnement du service.",
        ],
      },
      {
        heading: "Bases légales",
        paragraphs: [
          "La fourniture du service de consultation et du compte (lien magique, session, signalements) repose sur l’exécution de mesures précontractuelles ou contractuelles à votre demande, et/ou sur l’intérêt légitime de Hexa Décodeur à offrir et sécuriser le service.",
          "La géolocalisation pour centrer la carte repose sur votre consentement (permission du navigateur). Vous pouvez la refuser : l’application reste utilisable via la recherche de ville et le déplacement manuel de la carte.",
          "Google Analytics 4 repose sur votre consentement (bandeau cookies). Vous pouvez refuser ou retirer ce consentement sans perdre l’accès au service.",
          "L’utilisation des API publiques nécessaires au fonctionnement repose sur l’intérêt légitime de fournir le service, dans le respect des conditions d’usage de ces API.",
        ],
      },
      {
        heading: "Cookies et traceurs",
        paragraphs: [
          "CarbuTarn n’utilise pas de cookies publicitaires.",
          "Une mesure d’audience technique est réalisée via Vercel Web Analytics (prestataire d’hébergement) : pages vues, sans cookies publicitaires ni identifiant publicitaire. Elle sert à comprendre l’usage du service (intérêt légitime) et ne nécessite pas de consentement via le bandeau.",
          "En production, des rapports d’erreurs techniques peuvent être envoyés à Sentry (intérêt légitime de stabilité du service). Aucune adresse e-mail, cookie de session, jeton de connexion, en-tête Authorization ni coordonnée GPS précise n’est volontairement transmise ; un filtre défensif nettoie ces données des événements.",
          "Google Analytics 4 (Google Ireland / Google LLC) n’est activé qu’après ton consentement explicite via le bandeau « Mesure d’audience ». En cas de refus, le script n’est pas chargé. Tu peux modifier ton choix à tout moment via le lien « Cookies » en pied de page. L’adresse IP est anonymisée côté configuration lorsque le service est actif.",
          "Le cookie de session carbutarn_session est un cookie technique nécessaire à l’authentification.",
          "Le navigateur peut en outre conserver des données techniques locales (localStorage), y compris ton choix cookies (carbutarn:ga-consent), décrites ci-dessus.",
        ],
      },
      {
        heading: "Destinataires et sous-traitants",
        paragraphs: [
          "Selon les traitements : Vercel (hébergement du site, de l’API et mesure d’audience Web Analytics), Google (Google Analytics 4, uniquement si tu as accepté), Sentry (rapports d’erreurs techniques en production, sans adresse e-mail ni GPS volontairement transmis), Neon (base de données), Resend (envoi des e-mails de lien magique), et éventuellement Cloudflare (Turnstile).",
          "Des fournisseurs tiers peuvent être interrogés côté serveur pour le fonctionnement : data.economie.gouv.fr (prix officiels), geo.api.gouv.fr (communes). Les tuiles de carte sont fournies par MapTiler (données OpenStreetMap) lorsque la clé est configurée.",
          "Lorsque vous cliquez sur « Y aller », vous quittez CarbuTarn pour un service de cartographie tiers (Google Maps ou Apple Plans), soumis à leurs conditions.",
        ],
      },
      {
        heading: "Transferts hors UE",
        paragraphs: [
          "L’hébergeur Vercel et certains sous-traitants techniques peuvent traiter des données depuis des pays situés hors de l’Espace économique européen (notamment les États-Unis). Ces traitements s’effectuent dans le cadre contractuel prévu avec ces prestataires. Pour toute question, contactez hexadecodeur@gmail.com.",
        ],
      },
      {
        heading: "Durées de conservation",
        paragraphs: [
          "Tokens de lien magique : environ 15 minutes, puis invalidés ou expirés.",
          "Cookie / session : jusqu’à environ 7 jours, ou jusqu’à déconnexion (invalidation serveur).",
          "Compte (e-mail, identifiant) et signalements associés : conservés tant que le compte est actif, ou jusqu’à suppression depuis l’application (ou demande à hexadecodeur@gmail.com).",
          "Position GPS en mémoire navigateur : durée de la session d’onglet ; jamais stockée côté serveur.",
          "Préférences et caches locaux : jusqu’à effacement des données du site ou expiration (cache enseignes : 24 h).",
        ],
      },
      {
        heading: "Vos droits (RGPD)",
        paragraphs: [
          "Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité, dans les conditions prévues par la loi.",
          "Vous pouvez supprimer votre compte et les signalements associés directement depuis l’application (lien « Supprimer le compte »). Vous pouvez aussi contacter Hexa Décodeur à hexadecodeur@gmail.com.",
          "Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).",
        ],
      },
    ],
  },

  cgu: {
    id: "cgu",
    title: "Conditions générales d’utilisation",
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Objet",
        paragraphs: [
          "Les présentes Conditions Générales d’Utilisation (CGU) régissent l’accès et l’utilisation de l’application web CarbuTarn, éditée par Hexa Décodeur.",
          "En utilisant CarbuTarn, vous acceptez les présentes CGU. Si vous ne les acceptez pas, merci de ne pas utiliser le service.",
        ],
      },
      {
        heading: "Description du service",
        paragraphs: [
          "CarbuTarn permet de visualiser sur une carte et une liste les stations-service du Tarn, leurs prix de carburants issus de données publiques, des informations pratiques (adresse, services, horaires lorsqu’ils sont disponibles), et d’obtenir un itinéraire via un service de cartographie tiers.",
          "Le mode participatif permet aux utilisateurs connectés de confirmer un prix officiel (« Prix OK ») ou de signaler un désaccord avec une proposition de prix. Un prix « constaté » peut être affiché après agrégation (consensus) des signalements, selon les règles du service.",
          "Le service est fourni à titre gratuit, en l’état, et peut évoluer, être interrompu ou modifié sans préavis.",
        ],
      },
      {
        heading: "Compte et accès",
        paragraphs: [
          "La consultation de la carte et des prix officiels ne nécessite pas de compte. Le mode participatif (signalements) nécessite une connexion par lien magique envoyé à votre adresse e-mail.",
          "Vous êtes responsable de la confidentialité de votre boîte e-mail et de l’usage des liens de connexion qui vous sont adressés. Les liens magiques sont à usage limité dans le temps.",
          "L’utilisation nécessite un accès Internet et un navigateur compatible. Certaines fonctions (géolocalisation, itinéraire) dépendent des permissions de votre appareil et de services tiers.",
          "L’éditeur ne garantit pas un accès ininterrompu (maintenance, indisponibilité des API publiques, réseau, etc.).",
        ],
      },
      {
        heading: "Données affichées",
        paragraphs: [
          "Les prix « officiels » proviennent des déclarations référencées dans les données ouvertes de l’État. Ils peuvent être incomplets, en retard ou erronés par rapport à la réalité en station.",
          "Les prix « constatés » résultent d’un consensus algorithmique sur des signalements d’utilisateurs. Ils ne constituent pas une information officielle et peuvent être absents, incomplets ou inexacts.",
          "Les enseignes et positions peuvent être enrichies via OpenStreetMap ; leur exactitude dépend de cette base collaborative.",
          "CarbuTarn ne remplace pas l’affichage légal des prix en station ni un conseil personnalisé.",
        ],
      },
      {
        heading: "Usage autorisé et signalements",
        paragraphs: [
          "Vous vous engagez à utiliser CarbuTarn de façon loyale et conforme à la loi : consultation personnelle, pas d’attaque technique, pas d’extraction massive abusive des API au détriment de leur disponibilité, pas d’usurpation d’identité.",
          "Concernant les signalements : vous vous engagez à ne fournir que des informations de bonne foi, sans spam, sans fausses déclarations répétées, et dans le respect des règles anti-abus du service (notamment délais entre signalements et fourchette de prix lorsqu’une correction est proposée).",
          "L’éditeur se réserve le droit de suspendre l’accès au mode participatif, de limiter ou d’ignorer des signalements, ou de supprimer un compte en cas d’abus ou de manquement aux présentes CGU.",
          "Toute utilisation commerciale des contenus propres à CarbuTarn (marque, design) sans autorisation est interdite. La réutilisation des données publiques reste soumise aux licences et conditions de leurs producteurs.",
        ],
      },
      {
        heading: "Responsabilité",
        paragraphs: [
          "Dans les limites autorisées par la loi, Hexa Décodeur ne saurait être responsable des dommages indirects, pertes de données, décisions prises sur la base des prix affichés (officiels ou constatés), ou incidents liés à un itinéraire fourni par un tiers.",
          "Vous êtes responsable de la vérification des prix sur place avant tout paiement.",
        ],
      },
      {
        heading: "Résiliation et suppression du compte",
        paragraphs: [
          "Vous pouvez vous déconnecter à tout moment depuis l’application.",
          "Vous pouvez supprimer votre compte et les données personnelles associées depuis l’application (« Supprimer le compte »). Vous pouvez aussi contacter hexadecodeur@gmail.com. L’éditeur s’efforcera de traiter toute demande complémentaire dans un délai raisonnable, sous réserve des obligations légales de conservation éventuelles.",
        ],
      },
      {
        heading: "Propriété intellectuelle",
        paragraphs: [
          "Sauf mentions contraires (données ouvertes, OSM, contributions agrégées anonymisées dans le consensus), les éléments du service appartiennent à Hexa Décodeur ou à ses partenaires. Aucune licence n’est accordée au-delà du droit d’usage personnel du service.",
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
