import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface PDFExportOptions {
  filename?: string;
  title?: string;
  description?: string;
  includeMetadata?: boolean;
}

export class WorkflowPDFExporter {
  static async exportToPDF(
    workflowElement: HTMLElement,
    bpmnAnalysis: any,
    detectedActors: any[],
    options: PDFExportOptions = {}
  ): Promise<void> {
    try {
      const {
        filename = 'workflow-diagram',
        title = 'Workflow Diagram',
        description = '',
        includeMetadata = true
      } = options;

      // Create PDF document
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, 20, 25);

      // Add description if provided
      if (description) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(description, pageWidth - 40);
        pdf.text(descLines, 20, 35);
      }

      // Capture the workflow diagram
      const dataUrl = await toPng(workflowElement, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      // Calculate image dimensions to fit page
      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const imgRatio = img.width / img.height;
      const maxWidth = pageWidth - 40;
      const maxHeight = pageHeight - 80; // Reserve space for title and metadata

      let imgWidth = maxWidth;
      let imgHeight = maxWidth / imgRatio;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = maxHeight * imgRatio;
      }

      // Center the image
      const x = (pageWidth - imgWidth) / 2;
      const y = description ? 50 : 40;

      pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);

      // Add metadata if requested
      if (includeMetadata && bpmnAnalysis) {
        pdf.addPage();
        
        // Metadata page
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('BPMN Analysis Report', 20, 25);

        let yPos = 40;
        
        // Analysis summary
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Analysis Summary:', 20, yPos);
        yPos += 10;

        pdf.setFont('helvetica', 'normal');
        pdf.text(`Model Style: ${bpmnAnalysis.model_style || 'N/A'}`, 20, yPos);
        yPos += 7;
        pdf.text(`Confidence: ${Math.round((bpmnAnalysis.confidence || 0) * 100)}%`, 20, yPos);
        yPos += 7;
        pdf.text(`Pools: ${bpmnAnalysis.pools?.length || 0}`, 20, yPos);
        yPos += 7;
        pdf.text(`Detected Actors: ${detectedActors.length}`, 20, yPos);
        yPos += 15;

        // Detected Actors
        if (detectedActors.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Detected Actors:', 20, yPos);
          yPos += 10;

          pdf.setFont('helvetica', 'normal');
          detectedActors.forEach((actor) => {
            const actorText = `• ${actor.name} (${actor.type}) - Lane: ${actor.lane} - Confidence: ${Math.round(actor.confidence * 100)}%`;
            const lines = pdf.splitTextToSize(actorText, pageWidth - 40);
            pdf.text(lines, 25, yPos);
            yPos += lines.length * 5 + 2;
          });
          yPos += 10;
        }

        // BPMN Assumptions
        if (bpmnAnalysis.assumptions && bpmnAnalysis.assumptions.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Assumptions:', 20, yPos);
          yPos += 10;

          pdf.setFont('helvetica', 'normal');
          bpmnAnalysis.assumptions.forEach((assumption: string) => {
            const lines = pdf.splitTextToSize(`• ${assumption}`, pageWidth - 40);
            pdf.text(lines, 25, yPos);
            yPos += lines.length * 5 + 2;
          });
          yPos += 10;
        }

        // BPMN Advice
        if (bpmnAnalysis.advice && bpmnAnalysis.advice.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('BPMN Modeling Advice:', 20, yPos);
          yPos += 10;

          pdf.setFont('helvetica', 'normal');
          bpmnAnalysis.advice.forEach((advice: string) => {
            const lines = pdf.splitTextToSize(`• ${advice}`, pageWidth - 40);
            pdf.text(lines, 25, yPos);
            yPos += lines.length * 5 + 2;
          });
        }

        // Footer
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Generated on ${new Date().toLocaleString()}`, 20, pageHeight - 10);
        pdf.text('Created with Kflow - AI-Powered Workflow Designer', pageWidth - 80, pageHeight - 10);
      }

      // Save the PDF
      pdf.save(`${filename}.pdf`);
      
      console.log('✅ PDF exported successfully');
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      throw new Error(`Failed to export PDF: ${error}`);
    }
  }

  static async exportWorkflowImage(workflowElement: HTMLElement): Promise<string> {
    try {
      const dataUrl = await toPng(workflowElement, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      return dataUrl;
    } catch (error) {
      console.error('❌ Image export failed:', error);
      throw new Error(`Failed to export image: ${error}`);
    }
  }
}