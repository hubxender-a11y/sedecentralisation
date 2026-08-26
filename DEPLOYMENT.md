# Mise en ligne gratuite

## Architecture retenue

- Code source: depot GitHub prive.
- Application Next.js: Vercel.
- Base de donnees: Supabase PostgreSQL.
- Documents et images: Supabase Storage.

Le serveur local XAMPP ne doit pas etre expose sur Internet.

## Migration obligatoire avant le deploiement

Le projet utilise actuellement MySQL et des appels SQL directs. Il faut donc:

1. Creer un projet Supabase.
2. Remplacer le provider Prisma `mysql` par `postgresql` et adapter les types SQL incompatibles.
3. Remplacer les appels du helper `lib/mysql.ts` par Prisma ou le client Supabase.
4. Remplacer l'ecriture dans `public/uploads` par Supabase Storage.
5. Migrer les donnees XAMPP vers PostgreSQL et verifier les comptes administrateurs.

Une fois le schema adapte, depuis un environnement disposant de l'URL Supabase, executer:

```bash
npx prisma db push
```

Importer ensuite les donnees existantes avant de rendre le service public.

## Deploiement Vercel

1. Pousser le projet dans un depot GitHub prive.
2. Dans Vercel, choisir **Add New > Project** et selectionner le depot.
3. Ajouter `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `GEMINI_API_KEY` dans les variables d'environnement.
4. Definir `APP_URL` avec l'URL HTTPS Vercel.
5. Deployer puis tester la connexion, les agents et les documents.

Vercel fournit HTTPS et un sous-domaine gratuit.

## Attention aux secrets

Ne jamais committer `.env`, une chaine `DATABASE_URL`, une cle API ou un mot de passe.