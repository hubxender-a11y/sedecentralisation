import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canManageAgent, getServerUser } from '@/lib/serverAuth';
import { getRequestIp, writeAuditLog } from '@/lib/auditLog';

export async function POST(req: NextRequest) {
  const user = await getServerUser(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === 'string' && body.date ? body.date : new Date().toISOString().slice(0, 10);
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId : '';
  const serviceNom = typeof body.serviceNom === 'string' ? body.serviceNom : '';
  const directionId = typeof body.directionId === 'string' ? body.directionId : '';
  const directionNom = typeof body.directionNom === 'string' ? body.directionNom : '';

  try {
    const rows = await prisma.presence.findMany({
      where: { date },
      include: { agent: true },
      orderBy: { heure: 'asc' },
    });
    const [divisions, directions, services] = await Promise.all([
      prisma.division.findMany({ select: { id: true, nom: true, directionId: true, directionNom: true } }),
      prisma.direction.findMany({ select: { id: true, nom: true } }),
      prisma.service.findMany({ select: { id: true, nom: true, directionId: true, directionNom: true, divisionId: true, divisionNom: true } }),
    ]);
    const divisionById = new Map(divisions.map((item) => [item.id, item]));
    const divisionByName = new Map(divisions.map((item) => [item.nom.trim().toLowerCase(), item]));
    const serviceById = new Map(services.map((item) => [item.id, item]));
    const serviceByName = new Map(services.map((item) => [item.nom.trim().toLowerCase(), item]));
    const directionById = new Map(directions.map((item) => [item.id, item]));
    const directionByName = new Map(directions.map((item) => [item.nom.trim().toLowerCase(), item]));
    const requestedDirection = directionById.get(directionId) || directionByName.get(directionNom.trim().toLowerCase());
    const requestedDirectionId = requestedDirection?.id || directionId;
    const requestedDirectionName = requestedDirection?.nom || directionNom;

    const visibleRows = rows.filter((row) => {
      if (!canManageAgent(user, row.agent as any)) return false;
      const serviceName = row.serviceNom || row.agent.service || '';
      const service = serviceById.get(row.serviceId || '') || serviceByName.get(serviceName.trim().toLowerCase());
      const division = (row.agent.divisionId ? divisionById.get(row.agent.divisionId) : undefined) ||
        (row.agent.divisionNom ? divisionByName.get(row.agent.divisionNom.trim().toLowerCase()) : undefined) ||
        (service?.divisionId ? divisionById.get(service.divisionId) : undefined) ||
        (service?.divisionNom ? divisionByName.get(service.divisionNom.trim().toLowerCase()) : undefined);
      const legacyId = row.directionId || row.agent.directionId || service?.directionId || '';
      const legacyName = row.directionNom || row.agent.directionNom || service?.directionNom || '';
      const canonical = division?.directionId
        ? directionById.get(division.directionId)
        : service?.directionId
        ? directionById.get(service.directionId)
        : directionById.get(legacyId) || directionByName.get(legacyId.trim().toLowerCase()) || directionByName.get(legacyName.trim().toLowerCase());
      const matchesDirection = !requestedDirectionId && !requestedDirectionName ||
        canonical?.id === requestedDirectionId || canonical?.nom === requestedDirectionName ||
        legacyId === requestedDirectionId || legacyName === requestedDirectionName;
      const matchesService = !serviceId && !serviceNom || row.serviceId === serviceId || serviceName === serviceNom;
      return matchesDirection && matchesService;
    });

    const [pdfModule, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const JsPdf = (pdfModule as any).jsPDF || (pdfModule as any).default?.jsPDF || (pdfModule as any).default;
    const autoTable = (autoTableModule as any).default || (autoTableModule as any).autoTable;
    if (typeof JsPdf !== 'function' || typeof autoTable !== 'function') {
      throw new Error('Modules PDF indisponibles.');
    }
    const doc = new JsPdf({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RAPPORT QUOTIDIEN DE PRESENCE', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${date}`, 14, 23);
    doc.text(`Bureaux inclus : ${serviceNom || 'Tous les bureaux de la direction'}`, 14, 29);
    doc.text(`Direction : ${directionNom || visibleRows[0]?.directionNom || 'Toutes les directions'}`, 14, 35);
    doc.text(`Total present(s) : ${visibleRows.length}`, 14, 41);

    autoTable(doc, {
      startY: 48,
      head: [['N°', 'Matricule', 'Nom complet', 'Grade', 'Bureau', 'Heure de signature']],
      body: visibleRows.map((row, index) => [
        index + 1,
        row.agent.matricule || 'N.U',
        `${row.agent.nom} ${row.agent.postNom || ''} ${row.agent.prenom}`.trim(),
        row.agent.gradeId || row.agent.fonctionNom || '',
        row.serviceNom || row.agent.service || '',
        new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(row.heure),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [2, 132, 199] },
      margin: { left: 14, right: 14 },
    });

    const pdfBytes = doc.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfBytes);

    await writeAuditLog({
      userId: user.id,
      action: 'EXPORT_PRESENCE_PDF',
      entityType: 'Presence',
      entityId: `${date}:${requestedDirectionId || 'all'}:${serviceId || 'all'}`,
      oldValue: { date, directionId: requestedDirectionId, serviceId },
      newValue: { exportedRows: visibleRows.length },
      ipAddress: getRequestIp(req),
      result: 'SUCCESS',
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="presence-${date}.pdf"`,
      },
    });
  } catch (error) {
    console.error('POST /api/presences/export-pdf failed:', error);
    await writeAuditLog({
      userId: user.id,
      action: 'EXPORT_PRESENCE_PDF',
      entityType: 'Presence',
      entityId: `${date}:${directionId || 'all'}:${serviceId || 'all'}`,
      oldValue: { date, directionId, serviceId },
      newValue: { error: 'export_pdf_failed' },
      ipAddress: getRequestIp(req),
      result: 'FAILURE',
    });
    return NextResponse.json({ error: 'Impossible de générer le rapport PDF.' }, { status: 500 });
  }
}