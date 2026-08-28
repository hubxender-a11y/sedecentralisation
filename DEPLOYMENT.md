# Mise en ligne gratuite

## Architecture retenue

- Code source: depot GitHub prive.
- Application Next.js: Vercel.
- Base de donnees: Supabase PostgreSQL.
- Documents et images: Supabase Storage.

Le serveur local XAMPP ne doit pas etre expose sur Internet.

## Etat de la migration

Le runtime de l'application utilise Prisma avec PostgreSQL sur Supabase. Les routes
de production ne doivent pas utiliser `lib/mysql.ts` ni des requetes SQL MySQL.
Ces fichiers sont conserves uniquement pour les anciens scripts locaux d'inspection
et d'import, qui ne sont pas charges par Next.js en production.

Le schema Prisma utilise les variables Vercel creees par l'integration Supabase:

- `POSTGRES_PRISMA_URL` pour la connexion pooler Prisma.
- `POSTGRES_URL_NON_POOLING` pour la connexion directe.

Avant une evolution du schema, verifier la base cible puis executer depuis un
environnement autorise:

```bash
npx prisma generate
npx prisma db push
```

## Deploiement Vercel

1. Pousser le projet dans un depot GitHub prive.
2. Dans Vercel, choisir **Add New > Project** et selectionner le depot.
3. Configurer `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, les variables Supabase publiques et `GEMINI_API_KEY`.
4. Definir `APP_URL` avec l'URL HTTPS Vercel.
5. Deployer puis tester la connexion, les agents et les documents.

Vercel fournit HTTPS et un sous-domaine gratuit.

## Attention aux secrets

Ne jamais committer `.env`, une chaine `DATABASE_URL`, une cle API ou un mot de passe.