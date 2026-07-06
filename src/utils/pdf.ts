import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

export async function generateQuotePDF(quoteData: Record<string, any>, projectData: Record<string, any>, lotData: Record<string, any>) {
  // Create a hidden div to render the quote HTML
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.width = '800px'
  container.style.backgroundColor = 'white'
  container.style.padding = '40px'
  container.style.fontFamily = 'sans-serif'
  container.style.color = '#333'

  container.innerHTML = `
    <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="color: #4f46e5; margin: 0;">Quotation: ${quoteData.human_readable_code}</h1>
        <h2 style="color: #666; margin: 5px 0 0 0;">Project: ${projectData.name}</h2>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div style="width: 45%;">
            <h3 style="margin-bottom: 10px; color: #111;">Unit Details</h3>
            <p style="margin: 5px 0;"><strong>Identifier:</strong> ${lotData.identifier}</p>
            <p style="margin: 5px 0;"><strong>Area:</strong> ${lotData.area_sqm ? lotData.area_sqm + ' m²' : 'N/A'}</p>
        </div>
        <div style="width: 45%;">
            <h3 style="margin-bottom: 10px; color: #111;">Financial Summary</h3>
            <p style="margin: 5px 0;"><strong>Base Price:</strong> $${Number(quoteData.base_price).toLocaleString()}</p>
            <p style="margin: 5px 0; color: #16a34a;"><strong>Discount Applied:</strong> ${quoteData.discount_applied_percent}%</p>
            <p style="margin: 5px 0; font-size: 1.1em; color: #111;"><strong>Final Price:</strong> $${Number(quoteData.final_price).toLocaleString()}</p>
        </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
            <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Down Payment (${quoteData.down_payment_percent}%)</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Financed Amount</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Term (Months)</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left; background-color: #eef2ff; color: #4f46e5;">Monthly Installment</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">$${Number(quoteData.down_payment_amount).toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">$${Number(quoteData.financed_amount).toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${quoteData.term_months}</td>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #eef2ff; color: #4f46e5;">$${Number(quoteData.monthly_installment).toLocaleString()}</td>
            </tr>
        </tbody>
    </table>

    <div style="margin-top: 40px; padding: 20px; background-color: #f9fafb; border-radius: 8px; font-size: 12px; color: #666;">
        <p style="margin: 0 0 10px 0;"><strong>Valid Until:</strong> ${new Date(quoteData.valid_until).toLocaleDateString()}</p>
        <p style="margin: 0;">This document is an estimate for informative purposes and does not constitute a legally binding contract. Prices and availability are subject to change without prior notice.</p>
    </div>
  `

  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {} as any)
    const imgData = canvas.toDataURL('image/jpeg', 1.0)

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`Quote_${quoteData.human_readable_code}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
