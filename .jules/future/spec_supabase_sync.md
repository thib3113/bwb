# Spécification : Synchronisation via Supabase (Cloud & Self-Hosted)

## 🎯 Objectif

Permettre la synchronisation multi-appareils des Boks, des codes et des journaux d'événements en utilisant Supabase comme backend. L'architecture supporte une version "Cloud" officielle (avec abonnement utilisateur) et une version "Self-Hosted" (libre).

## ⚙️ Configuration de l'instance

Dans la section **Avancé** des paramètres :

- **Mode de synchronisation** : Sélecteur entre "Désactivé", "Boks Cloud" (par défaut), et "Instance personnalisée".
- **Instance personnalisée** :
  - `Supabase URL` (Ex : `https://xyz.supabase.co`)
  - `Supabase Publishable Key` (Format : `sb_publishable_...`)
  - `Supabase Auth URL`
- **Authentification** : Connexion via Email/Mot de passe.

> [!TIP]
> Nous utilisons exclusivement le nouveau format de clés d'API de Supabase (lancé en juin 2025).
>
> - **Clé Publishable** : Seule clé autorisée côté client.
> - **Clé Secret** (`sb_secret_...`) : **Interdite** dans l'application, car elle contourne les politiques de sécurité (RLS) et provoquerait une erreur 401 dans le navigateur.

## 👥 Gestion des Rôles & Accès

Le système repose sur une table de liaison `user_devices` (côté Supabase) définissant le rôle d'un utilisateur pour une Boks :

### 1. Rôle : Admin

- Accès complet en lecture/écriture.
- Seuls les Admins peuvent lire la `configuration_key` (table `device_secrets`).
- Approuve les codes créés par les simples utilisateurs.
- Si l'Admin est **Premium**, la Boks bénéficie de la synchronisation cloud.

### 2. Rôle : User

- Accès limité : ne peut pas voir les secrets (`configuration_key`).
- Peut créer des codes, mis automatiquement en `pending_approval`.
- Bénéficie de la synchronisation cloud **uniquement si l'Admin de la Boks est Premium**.

## 💰 Modèle Économique (Boks Cloud)

L'abonnement est lié à l'utilisateur qui possède/administre la Boks.

1.  **Gratuit (Cloud)** :
    - Synchronisation des **paramètres personnels** (Thème, Langue, Profil).
    - Gestion locale Dexie illimitée.
2.  **Premium (Payé par l'utilisateur)** :
    - Un utilisateur payant débloque le mode Premium pour **toutes les Boks où il est Admin**.
    - **Limite de partage** : Chaque Boks Premium accepte jusqu'à **10 utilisateurs synchronisés** (Admin inclus).
    - Tous les membres d'une Boks Premium (jusqu'à 10) synchronisent gratuitement leurs codes et logs.

---

## 💾 Architecture de la base de données locale (Dexie)

Pour supporter la synchronisation, l'architecture locale doit refléter le schéma distant tout en restant optimisée pour l'offline.

### 1. Schéma des tables Dexie

```typescript
db.version(1).stores({
  profiles: 'id, updated_at', // id = Supabase User ID
  devices: 'id, ble_name, updated_at', // Ajout du champ 'role' (admin/user)
  device_secrets: 'device_id, updated_at', // Séparé pour matcher Supabase
  codes: 'id, device_id, updated_at',
  logs: 'id, device_id, timestamp, updated_at'
});
```

### 2. Gestion automatique du champ `updated_at`

Afin de garantir que "le plus récent gagne", un hook global sur Dexie met à jour automatiquement le timestamp à chaque écriture :

```typescript
db.tables.forEach((table) => {
  table.hook('creating', (primKey, obj) => {
    obj.updated_at = Date.now();
  });
  table.hook('updating', (modifications) => {
    return { ...modifications, updated_at: Date.now() };
  });
});
```

### 3. Nettoyage des données (Wipe)

Lors du **Logout**, une fonction `clearAllData()` est impérativement appelée pour vider toutes les tables Dexie et le localStorage, garantissant qu'un autre utilisateur sur le même navigateur ne voie pas les données précédentes.

---

## 🔄 Logique de Synchronisation

- **Offline-First** : Dexie (Local) est la source immédiate.
- **Conflits** : "Le plus récent gagne" via le champ `updated_at`.
- **Filtre** : Les tables `codes` et `logs` ne synchronisent que les lignes dont le `device_id` appartient à une Boks activement Premium.

---

## 🛠️ Schéma de base de données (SQL Supabase)

```sql
-- 1. Types Énumérés
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- 2. Profils (Paramètres personnels)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  premium_until TIMESTAMPTZ, -- L'abonnement est ici
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'fr',
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Appareils (Boks)
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  ble_name TEXT UNIQUE NOT NULL,
  friendly_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Secrets (Accès restreint Admins)
CREATE TABLE device_secrets (
  device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  configuration_key TEXT,
  door_pin_code TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Liaison Utilisateurs <-> Boks
CREATE TABLE user_devices (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  role user_role DEFAULT 'user' NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, device_id)
);

-- 6. Codes
CREATE TABLE codes (
  id UUID PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Logs
CREATE TABLE logs (
  id UUID PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  event TEXT NOT NULL,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Sécurité RLS (Row Level Security)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Accès Profil
CREATE POLICY "Profile access" ON profiles FOR ALL USING (auth.uid() = id);

-- Accès Boks (Si membre)
CREATE POLICY "Device access" ON devices FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_devices WHERE device_id = devices.id AND user_id = auth.uid())
);

-- Accès Secrets (Si Admin membre)
CREATE POLICY "Secret access" ON device_secrets FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_devices WHERE device_id = device_secrets.device_id AND user_id = auth.uid() AND role = 'admin')
);

-- Accès Codes & Logs (Si membre ET (Boks payée PAR un de ses admins) ET (Limite 10 users))
CREATE POLICY "Premium sync access" ON codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_devices ud_member
      JOIN user_devices ud_admin ON ud_admin.device_id = ud_member.device_id
      JOIN profiles p_admin ON p_admin.id = ud_admin.user_id
      WHERE ud_member.device_id = codes.device_id
      AND ud_member.user_id = auth.uid()
      AND ud_admin.role = 'admin'
      AND p_admin.premium_until > NOW()
      AND (SELECT count(*) FROM user_devices WHERE device_id = codes.device_id) <= 10
    )
  );
```
