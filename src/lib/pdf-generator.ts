import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface SessionReportData {
    session: any;
    movements: any[];
    reconciliation: any;
    opener: string;
    closer: string;
}

export function generateSessionReport(data: SessionReportData) {
    const doc = new jsPDF();
    const { session, movements, reconciliation, opener, closer } = data;

    // Header
    doc.setFontSize(20);
    doc.text("Rapport de Session de Caisse", 14, 22);

    doc.setFontSize(11);
    doc.text(`Caisse: ${session.cashRegister.id}`, 14, 32);
    doc.text(`Ouvert par: ${opener} le ${format(new Date(session.open_on), "dd/MM/yyyy HH:mm")}`, 14, 38);
    doc.text(`Fermé par: ${closer} le ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 44);

    // Financial Summary
    doc.setFontSize(14);
    doc.text("Résumé Financier", 14, 55);

    const summaryData = [
        ["Fonds Initiaux (Théorique)", `${Number(session.theorical_initial_funds).toLocaleString()} XAF`],
        ["Total Entrées", `${movements.filter((m: any) => m.sense === 'entree').reduce((acc: number, m: any) => acc + Number(m.amount), 0).toLocaleString()} XAF`],
        ["Total Sorties", `${movements.filter((m: any) => m.sense === 'sortie').reduce((acc: number, m: any) => acc + Number(m.amount), 0).toLocaleString()} XAF`],
        ["Solde Théorique de Clôture", `${Number(reconciliation.theorical_total).toLocaleString()} XAF`],
        ["Solde Physique Compté", `${Number(reconciliation.physical_total).toLocaleString()} XAF`],
        ["Différence", `${Number(reconciliation.difference).toLocaleString()} XAF`],
    ];
    if (reconciliation?.justification) {
        summaryData.push(["Justification", reconciliation.justification]);
    }

    autoTable(doc, {
        startY: 60,
        head: [['Libellé', 'Montant']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
    });

    // Movements Detail
    doc.text("Détail des Mouvements", 14, (doc as any).lastAutoTable.finalY + 15);

    const movementsData = movements.map((m: any) => [
        format(new Date(m.create_on), "HH:mm"),
        m.sense.toUpperCase(),
        m.reason || "-",
        `${Number(m.amount).toLocaleString()} XAF`
    ]);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Heure', 'Type', 'Motif', 'Montant']],
        body: movementsData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text('Page ' + String(i) + ' of ' + String(pageCount), 196, 285, { align: 'right' });
    }

    return doc.output("arraybuffer");
}

export function generateTransactionsReport(data: {
    movements: any[];
    filters: any;
    total: number;
}) {
    const doc = new jsPDF();
    const { movements, filters, total } = data;

    // Header
    doc.setFontSize(20);
    doc.text("Rapport des Transactions", 14, 22);

    doc.setFontSize(11);
    doc.text(`Date de génération: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 32);
    if (filters.startDate) {
        doc.text(`Période: Du ${format(new Date(filters.startDate), "dd/MM/yyyy")} au ${filters.endDate ? format(new Date(filters.endDate), "dd/MM/yyyy") : "aujourd'hui"}`, 14, 38);
    }
    doc.text(`Total de transactions: ${total}`, 14, filters.startDate ? 44 : 38);

    // Calculate totals
    const totalIn = movements
        .filter((m: any) => m.sense === 'entree')
        .reduce((sum: number, m: any) => sum + Number(m.amount), 0);
    const totalOut = movements
        .filter((m: any) => m.sense === 'sortie')
        .reduce((sum: number, m: any) => sum + Number(m.amount), 0);

    // Summary
    doc.setFontSize(14);
    doc.text("Résumé", 14, filters.startDate ? 55 : 49);

    const summaryData = [
        ["Total Entrées", `${totalIn.toLocaleString()} XAF`],
        ["Total Sorties", `${totalOut.toLocaleString()} XAF`],
        ["Solde Net", `${(totalIn - totalOut).toLocaleString()} XAF`],
    ];

    autoTable(doc, {
        startY: filters.startDate ? 60 : 54,
        head: [['Type', 'Montant']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
    });

    // Transactions Detail
    doc.text("Détail des Transactions", 14, (doc as any).lastAutoTable.finalY + 15);

    const transactionsData = movements.map((m: any) => [
        format(new Date(m.create_on), "dd/MM/yyyy HH:mm"),
        m.sense === 'entree' ? 'IN' : 'OUT',
        m.reason || "-",
        m.creator?.user_first_name || 'Unknown',
        m.session?.cashRegister?.town || 'Unknown',
        `${Number(m.amount).toLocaleString()} XAF`
    ]);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Date', 'Type', 'Motif', 'Caissier', 'Caisse', 'Montant']],
        body: transactionsData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text('Page ' + String(i) + ' of ' + String(pageCount), 196, 285, { align: 'right' });
    }

    return doc.output("arraybuffer");
}

export function generateRegisterReport(data: {
    register: any;
    sessions: any[];
    totalRevenue: number;
    startDate: Date;
    endDate: Date;
}) {
    const doc = new jsPDF();
    const { register, sessions, totalRevenue, startDate, endDate } = data;

    // Header
    doc.setFontSize(20);
    doc.text("Rapport d'Activité de Caisse", 14, 22);

    doc.setFontSize(11);
    doc.text(`Caisse: ${register.town || 'Unknown'} (${register.id})`, 14, 32);
    doc.text(`Période: Du ${format(startDate, "dd/MM/yyyy")} au ${format(endDate, "dd/MM/yyyy")}`, 14, 38);
    doc.text(`Nombre de sessions: ${sessions.length}`, 14, 44);
    doc.text(`Revenu total: ${totalRevenue.toLocaleString()} XAF`, 14, 50);

    // Sessions Summary
    doc.setFontSize(14);
    doc.text("Résumé des Sessions", 14, 61);

    const sessionsData = sessions.map((s: any) => {
        const sessionTotal = s.movements.reduce((sum: number, m: any) => {
            return sum + (m.sense === 'entree' ? Number(m.amount) : -Number(m.amount));
        }, 0);

        return [
            format(new Date(s.open_on), "dd/MM/yyyy"),
            s.opener?.user_first_name || 'Unknown',
            s.state === 'fermee' ? 'Fermée' : 'Ouverte',
            `${Number(s.theorical_initial_funds).toLocaleString()} XAF`,
            `${sessionTotal.toLocaleString()} XAF`,
            s.reconciliation ? `${Number(s.reconciliation.difference).toLocaleString()} XAF` : '-'
        ];
    });

    autoTable(doc, {
        startY: 66,
        head: [['Date', 'Caissier', 'État', 'Fonds Initial', 'Total', 'Différence']],
        body: sessionsData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text('Page ' + String(i) + ' of ' + String(pageCount), 196, 285, { align: 'right' });
    }

    return doc.output("arraybuffer");
}
