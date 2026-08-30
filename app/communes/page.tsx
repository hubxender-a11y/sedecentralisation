import TerritoryManager from '@/components/TerritoryManager';

export default function CommunesPage() {
  return <TerritoryManager entity="commune" title="Communes" singularLabel="Commune" parentLabel="Ville" parentEndpoint="villes" parentKey="villeId" />;
}
