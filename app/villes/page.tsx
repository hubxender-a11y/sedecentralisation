import TerritoryManager from '@/components/TerritoryManager';

export default function VillesPage() {
  return <TerritoryManager entity="ville" title="Villes" singularLabel="Ville" parentLabel="Province" parentEndpoint="provinces" parentKey="provinceId" />;
}
