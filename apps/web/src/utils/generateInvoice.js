import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateInvoice = (client, payment) => {
    // Initialize jsPDF instance
    const doc = new jsPDF();
    
    // Set Document Properties
    doc.setProperties({
        title: `RestroBaba_Receipt_${payment.transactionId || payment.id}`,
        subject: 'Payment Receipt',
        author: 'RestroBaba System',
        creator: 'RestroBaba'
    });

    // 1. Header (Company Info)
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('RESTROBABA', 14, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Cloud Restaurant Management System', 14, 28);
    doc.text('Kathmandu, Nepal', 14, 33);
    doc.text('contact@restrobaba.com | +977-1234567890', 14, 38);

    // 2. Receipt Label
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('PAYMENT RECEIPT', 140, 22, { align: 'left' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Receipt No: ${payment.transactionId || payment.id.substring(0, 8).toUpperCase()}`, 140, 28);
    doc.text(`Date: ${new Date(payment.date).toLocaleDateString()}`, 140, 33);

    // 3. Divider Line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 45, 196, 45);

    // 4. Billed To
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('Billed To:', 14, 55);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(client.name, 14, 61);
    doc.text(`Email: ${client.email}`, 14, 66);
    if (client.shopCode) doc.text(`Shop Code: ${client.shopCode}`, 14, 71);

    // 5. Payment Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('Payment Information:', 140, 55);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(`Method: ${payment.method}`, 140, 61);
    doc.text(`Status: ${payment.amountPaid >= payment.totalPayable ? 'Paid in Full' : 'Partial/Pending'}`, 140, 66);
    if (payment.billingMonth) doc.text(`Billing Month: ${payment.billingMonth}`, 140, 71);

    // 6. Transaction Table
    const tableData = [
        ['Subscription Plan', `${payment.planTier} (${payment.planDuration})`],
        ['Base Amount', `Rs. ${(payment.baseAmount || 0).toLocaleString()}`],
    ];

    if (payment.discount && payment.discount > 0) {
        tableData.push(['Discount Applied', `- Rs. ${(payment.discount).toLocaleString()}`]);
    }

    tableData.push(['Total Payable', `Rs. ${(payment.totalPayable || 0).toLocaleString()}`]);
    tableData.push(['Amount Paid', `Rs. ${(payment.amountPaid || 0).toLocaleString()}`]);

    // If there is leftover balance (debt/credit on this specific transaction)
    const transactionBalance = (payment.amountPaid || 0) - (payment.totalPayable || 0);
    if (transactionBalance !== 0) {
        tableData.push([
            transactionBalance < 0 ? 'Remaining Due' : 'Credited to Account',
            `Rs. ${Math.abs(transactionBalance).toLocaleString()}`
        ]);
    }

    doc.autoTable({
        startY: 85,
        head: [['Description', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { textColor: 50 },
        columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 'auto', halign: 'right' }
        },
        styles: { fontSize: 10, cellPadding: 6 }
    });

    // 7. Remarks & Notes
    const finalY = doc.lastAutoTable.finalY || 130;
    
    if (payment.remarks) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(80, 80, 80);
        doc.text(`Note: ${payment.remarks}`, 14, finalY + 15);
    }

    // 8. Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 200, 200);
    doc.line(14, pageHeight - 30, 196, pageHeight - 30);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('This is a system generated official receipt.', 105, pageHeight - 22, { align: 'center' });
    doc.text('Thank you for choosing RestroBaba!', 105, pageHeight - 16, { align: 'center' });

    // Download the PDF
    const filename = `RestroBaba_Receipt_${client.name.replace(/\s+/g, '_')}_${new Date(payment.date).toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
};
