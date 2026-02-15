# Boks Web BLE

<p align="center">
  Une interface web moderne pour contrôler vos boîtes à colis Boks.<br>
  <em>A modern web interface to control your Boks parcel boxes.</em>
</p>

<p align="center">
  <a href="https://thib3113.github.io/bwb/">
    <img src="https://img.shields.io/badge/Lancer_l'application-3DDC84?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Lancer l'application">
  </a>
  &nbsp;
  <a href="https://thib3113.github.io/bwb/">
    <img src="https://img.shields.io/badge/Launch_App-3DDC84?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Launch App">
  </a>
</p>


---

## 🇫🇷 Français

### À propos
Cette application est une **Progressive Web App (PWA)** permettant de contrôler votre boîte à colis Boks directement depuis votre navigateur, sans installer l'application officielle. Elle utilise la technologie **Web Bluetooth** pour communiquer de manière sécurisée et locale avec votre appareil.

### Fonctionnalités principales
- **Connexion Bluetooth Rapide** : Détection et appairage instantanés avec votre Boks.
- **Ouverture à Distance** : Déverrouillez la porte de votre Boks en un clic depuis votre téléphone ou ordinateur.
- **Gestion des Codes** :
  - Créez des codes permanents (Master) pour vous.
  - Générez des codes à usage unique ou multi-usages pour les livreurs.
  - Supprimez les codes obsolètes.
- **Historique et Journaux** : Consultez l'historique complet des ouvertures, livraisons et événements techniques.
- **Mode Hors-ligne** : L'application fonctionne même sans connexion internet une fois chargée.
- **Support Multi-plateforme** : Compatible avec Android (Google Chrome), iOS (via l'application "Bluefy"), et Desktop (Chrome, Edge).

### Comment utiliser
1. **Ouvrez** cette page dans un navigateur compatible :
   - **Android / PC / Mac** : Google Chrome ou Microsoft Edge.
   - **iOS (iPhone/iPad)** : Utilisez l'application gratuite **Bluefy** (Web Bluetooth Browser).
2. **Activez** le Bluetooth sur votre appareil.
3. **Cliquez** sur le bouton de connexion (icône Bluetooth) en haut à droite.
4. **Sélectionnez** votre Boks dans la liste des appareils détectés.
5. Une fois connecté, naviguez via les onglets pour ouvrir la porte, gérer les codes ou voir les journaux.

---

## 🇬🇧 English

### About
This application is a **Progressive Web App (PWA)** that allows you to control your Boks parcel box directly from your browser, without installing the official app. It uses **Web Bluetooth** technology to communicate securely and locally with your device.

### Key Features
- **Fast Bluetooth Connection**: Instant detection and pairing with your Boks.
- **Remote Unlock**: Open your Boks door with a single click from your phone or computer.
- **Code Management**:
  - Create permanent (Master) codes for yourself.
  - Generate single-use or multi-use codes for delivery personnel.
  - Delete obsolete codes.
- **History & Logs**: View the full history of openings, deliveries, and technical events.
- **Offline Mode**: Works even without an internet connection once loaded.
- **Cross-Platform Support**: Compatible with Android (Google Chrome), iOS (via "Bluefy" app), and Desktop (Chrome, Edge).

### How to use
1. **Open** this page in a compatible browser:
   - **Android / PC / Mac**: Google Chrome or Microsoft Edge.
   - **iOS (iPhone/iPad)**: Use the free **Bluefy** app (Web Bluetooth Browser).
2. **Enable** Bluetooth on your device.
3. **Click** the connect button (Bluetooth icon) in the top right corner.
4. **Select** your Boks from the list of detected devices.
5. Once connected, navigate via the tabs to open the door, manage codes, or view logs.

---

# ⚖️ Mentions Légales / Legal Disclaimer

## 🇫🇷 Français

**Projet Non Officiel**
Ce projet est une **Application Web (PWA)** indépendante et open-source développée à des fins d'interopérabilité. Il n'est **pas** affilié, soutenu ou associé au fabricant de l'appareil ou à son application officielle.

**Propriété Intellectuelle & Ingénierie Inverse**
Le code fourni dans ce dépôt est le résultat d'une ingénierie inverse et d'une analyse indépendantes, menées dans le strict respect de la **Directive Européenne 2009/24/CE** (Article 6) et du **Code de la Propriété Intellectuelle Français** (Article L.122-6-1). Ces textes autorisent explicitement la décompilation et l'étude d'un logiciel dans le but unique d'obtenir l'**interopérabilité** avec un autre logiciel (ici, cette application Web Bluetooth), dès lors que les informations nécessaires n'ont pas été rendues disponibles par l'éditeur.

**Absence de Contrefaçon**

- Aucun code propriétaire, binaire ou actif visuel (logos, images) provenant du firmware ou de l'application originale n'est distribué dans ce dépôt.
- Toute la logique a été réimplémentée proprement ("clean-room") sur la base de la compréhension des protocoles de communication.
- **Informations Publiques :** Tous les paramètres techniques, clefs API, constantes ou identifiants présents dans ce dépôt sont des **informations publiquement accessibles**. Ils sont extraits du code de l'application client (distribuée à tous les utilisateurs) ou du trafic réseau standard. Aucun secret privé côté serveur ni clef maître cryptographique n'est distribué.

**Contexte Technique**
Cette application fonctionne exclusivement via **Bluetooth Low Energy (Web BLE)**, directement depuis le navigateur de l'utilisateur vers l'appareil. Elle ne dépend d'aucun service cloud propriétaire ou API backend du fabricant de l'appareil.

**Politique de Confidentialité**
- **Stockage Local Uniquement :** Toutes les données (codes PIN, journaux, identifiants d'appareil) sont stockées localement dans l'IndexedDB de votre navigateur. Aucune donnée n'est envoyée à un serveur externe ou à l'auteur.
- **Communication Directe :** La communication s'effectue directement entre votre navigateur et l'appareil Boks via Bluetooth.
- **Pas d'Analyses :** Aucun outil de suivi ou d'analyse n'est utilisé dans cette application.

**Responsabilité**
Ce logiciel est fourni "TEL QUEL", sans aucune garantie. L'auteur ne peut être tenu responsable des dommages causés à votre appareil, de l'annulation des garanties officielles ou des risques de sécurité résultant de l'utilisation de ce logiciel. Vous l'utilisez à vos propres risques.

---

## 🇬🇧 English

**Unofficial Project**
This project is an independent, open-source **Web Application (PWA)** developed for interoperability purposes. It is **not** affiliated with, endorsed by, or associated with the manufacturer of the device or its official application.

**Intellectual Property & Reverse Engineering**
The code provided in this repository is the result of independent reverse engineering and analysis, conducted in strict accordance with **European Directive 2009/24/EC** (Article 6) and **French Intellectual Property Code** (Article L.122-6-1). These laws explicitly allow the decompilation and study of software for the sole purpose of achieving **interoperability** with other software (in this case, this Web Bluetooth Application), provided that the necessary information has not been made available by the vendor.

**No Copyright Infringement Intended**

- No proprietary code, binaries, or assets (logos, images) from the original firmware or application are distributed in this repository.
- All logic has been clean-room re-implemented based on the understanding of the communication protocols.
- **Publicly Available Information:** All technical parameters, API keys, constants, or identifiers present in this repository are **publicly discoverable information**. They are extracted from the client-side application code (distributed to all users) or standard network traffic. No server-side private secrets or cryptographic master keys are distributed.

**Technical Context**
This application operates exclusively via **Bluetooth Low Energy (Web BLE)** directly from the user's browser to the device. It does not rely on any proprietary cloud service or backend API from the device manufacturer.

**Privacy Policy**
- **Local Storage Only:** All data (PIN codes, logs, device identifiers) are stored locally in your browser's IndexedDB. No data is sent to any external server or the author.
- **Direct Communication:** Communication happens directly between your browser and the Boks device via Bluetooth.
- **No Analytics:** No tracking or analytics are used in this application.

**Liability**
This software is provided "AS IS", without warranty of any kind. The author cannot be held responsible for any damage to your device, voiding of official warranties, or security risks resulting from the use of this software. Use it at your own risk.
