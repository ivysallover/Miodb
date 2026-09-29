import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportDashboardToPDF(elementId: string, filename: string = "dashboard_mio.pdf"): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    // We add a tiny delay or use html2canvas directly
    const canvas = await html2canvas(element, {
      scale: 2, // Better resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // If height > page height, we could add pages, but for a dashboard, it's often better to just scale it
    // or we add pages manually. Let's just fit it in one long page or scale to fit.
    
    // Actually, A4 is fixed height. If it exceeds, we should add pages.
    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (err) {
    console.error('Error generating PDF:', err);
    throw err;
  }
}
