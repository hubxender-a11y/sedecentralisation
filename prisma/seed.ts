import { createPool } from 'mysql2/promise';
import {
  initialDirections,
  initialServices,
  initialFonctions,
  initialDistricts,
  initialVilles,
  initialCommunes,
  initialAgents,
} from '../lib/dataStore';

const databaseUrl = process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/sga_kna_db';
const parsed = new URL(databaseUrl);
const pool = createPool({
  host: parsed.hostname,
  port: Number(parsed.port) || 3306,
  user: parsed.username || 'root',
  password: parsed.password || undefined,
  database: parsed.pathname.replace(/\//g, ''),
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

async function upsert(table: string, row: Record<string, any>, uniqueKey: string) {
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns.filter((key) => key !== uniqueKey).map((key) => `${key}=VALUES(${key})`).join(', ');
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
  await pool.execute(sql, columns.map((key) => row[key]));
}

function safeValue(value: unknown) {
  return value === undefined ? null : value;
}

async function main() {
  console.log('Seeding database with initial SGA Kna+ data...');

  for (const dir of initialDirections) {
    await upsert('divisions', {
      id: dir.id,
      nom: dir.nom,
      description: safeValue(dir.description),
      statut: dir.statut,
      createdAt: safeValue(dir.createdAt),
    }, 'id');
  }

  for (const srv of initialServices) {
    await upsert('bureaux', {
      id: srv.id,
      nom: srv.nom,
      divisionId: srv.directionId,
      divisionNom: safeValue(srv.directionNom),
      codeService: safeValue(srv.codeService),
      description: safeValue(srv.description),
      chefService: safeValue(srv.chefService),
      statut: srv.statut,
      createdAt: safeValue(srv.createdAt),
    }, 'id');
  }

  for (const fnc of initialFonctions) {
    await upsert('fonctions', {
      id: fnc.id,
      nom: fnc.nom,
      description: safeValue(fnc.description),
      statut: fnc.statut,
      createdAt: safeValue(fnc.createdAt),
    }, 'id');
  }

  for (const fnc of initialFonctions) {
    await upsert('grades', {
      id: fnc.id,
      nom: fnc.nom,
      description: safeValue(fnc.description),
      statut: fnc.statut,
      createdAt: safeValue(fnc.createdAt),
      updatedAt: safeValue(fnc.createdAt),
    }, 'id');
  }

  for (const dst of initialDistricts) {
    await upsert('districts', {
      id: dst.id,
      nom: dst.nom,
    }, 'id');
  }

  for (const vil of initialVilles) {
    await upsert('villes', {
      id: vil.id,
      nom: vil.nom,
      districtId: vil.districtId,
    }, 'id');
  }

  for (const com of initialCommunes) {
    await upsert('communes', {
      id: com.id,
      nom: com.nom,
      villeId: com.villeId,
    }, 'id');
  }

  for (const ag of initialAgents) {
    await upsert('agents', {
      id: ag.id,
      nom: ag.nom,
      postNom: safeValue(ag.postNom),
      prenom: ag.prenom,
      dateNaissance: safeValue(ag.dateNaissance),
      sexe: safeValue(ag.sexe),
      nationalite: safeValue(ag.nationalite),
      matricule: safeValue(ag.matricule),
      typeCarte: safeValue(ag.typeCarte),
      numeroCarte: safeValue(ag.numeroCarte),
      expirationCarte: safeValue(ag.expirationCarte),
      lieuDelivrance: safeValue(ag.lieuDelivrance),
      divisionId: safeValue(ag.directionId),
      divisionNom: safeValue(ag.directionNom),
      serviceId: safeValue(ag.serviceId),
      service: safeValue(ag.service),
      fonctionId: safeValue(ag.fonctionId),
      fonctionNom: safeValue(ag.fonctionNom),
      email: safeValue(ag.email),
      telephone: safeValue(ag.telephone),
      districtId: safeValue(ag.districtId),
      villeId: safeValue(ag.villeId),
      communeId: safeValue(ag.communeId),
      avenue: safeValue(ag.avenue),
      code: safeValue(ag.code),
      statut: safeValue(ag.statut),
      statutPaiement: safeValue(ag.statutPaiement),
      montantPaiement: safeValue(ag.montantPaiement),
      datePaiement: safeValue(ag.datePaiement),
      createdAt: safeValue(ag.createdAt),
    }, 'id');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
