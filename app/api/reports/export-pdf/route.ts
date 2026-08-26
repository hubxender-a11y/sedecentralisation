import { NextResponse } from 'next/server';
import { getAgents } from '@/lib/dbService';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';

async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.warn('Unable to load image for PDF export:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerUser(request);
    if (!user) return NextResponse.json({ ok: false, message: 'Non autorisé' }, { status: 401 });
    const body = await request.json();
    const { filters } = body ?? {};

    const allAgents = await getAgents();
    const search = String(filters?.search || '').trim().toLowerCase();
    const agents = allAgents.filter((agent) => {
      if (!canManageAgent(user, agent)) return false;
      if (filters?.directionId && agent.directionId !== filters.directionId && agent.directionNom !== filters.directionId) return false;
      if (filters?.service && agent.service !== filters.service && agent.serviceId !== filters.service) return false;
      if (filters?.statut && agent.statut.toUpperCase() !== String(filters.statut).toUpperCase()) return false;
      if (filters?.sexe && String(agent.sexe || '').toUpperCase() !== String(filters.sexe).toUpperCase()) return false;
      if (search) {
        const text = `${agent.nom} ${agent.postNom || ''} ${agent.prenom} ${agent.matricule || ''} ${agent.directionNom || ''}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
    const logoDataUrl = await fetchImageDataUrl(`${baseUrl}/rdc-logo.jpg`);

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'JPEG', pageWidth - 32, 8, 18, 18);
      } catch (error) {
        console.warn('Unable to add logo to PDF export', error);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', 14, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text("MINISTÈRE DE L'INTÉRIEUR, SÉCURITÉ, DÉCENTRALISATION ET AFFAIRES COUTUMIÈRES", 14, 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('SECRÉTARIAT GÉNÉRAL À LA DÉCENTRALISATION — DIVISION DES RESSOURCES HUMAINES', 14, 22);

    const tableHead = [[
      'N°',
      'Matricule',
      'Nom Complet',
      'Sexe',
      'Service / Division',
      'Grade',
      'Statut RH',
      'Paiement',
      'Montant',
    ]];

    const tableBody = (agents as any[]).map((ag, idx) => {
      const nomComplet = `${ag.nom || ''} ${ag.postNom || ''} ${ag.prenom || ''}`.trim();
      return [
        idx + 1,
        ag.matricule || 'N/A',
        nomComplet,
        ag.sexe || 'M',
        ag.service || 'Général',
        ag.fonctionNom || 'Non spécifié',
        ag.statut || 'BROUILLON',
        ag.statutPaiement || 'NON_PAYE',
        ag.montantPaiement ? `${Number(ag.montantPaiement).toLocaleString('fr-FR')} CDF` : '0 CDF',
      ];
    });

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 34,
      theme: 'striped',
      headStyles: { fillColor: [2, 132, 199] },
      bodyStyles: { fillColor: [248, 250, 252] },
      alternateRowStyles: { fillColor: [238, 242, 255] },
      margin: { left: 14, right: 14 },
    });

    const pdfBytes = doc.output('arraybuffer');
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="rapport-rh.pdf"',
      },
    });
  } catch (error) {
    console.error('Failed to generate PDF report', error);
    return NextResponse.json({ ok: false, message: 'Erreur lors de la génération du PDF.' }, { status: 500 });
  }
}
