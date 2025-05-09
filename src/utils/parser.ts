// import * as pdfjs from 'pdfjs-dist';
// const { getDocument, GlobalWorkerOptions } = pdfjs; 
// const pdfjsVersion = '3.11.174'; 
// GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

export interface PayslipItem {
  category: string;
  amount: number;
}


async function parsePdfDummy(_pdfContent: ArrayBuffer): Promise<PayslipItem[]> {
    console.log("parsePdfDummy called. Returning hardcoded test data...");

    await new Promise(resolve => setTimeout(resolve, 500)); // Delay for simulation

    const dummyData: PayslipItem[] = [
        { category: 'Income Tax (Test)', amount: 5200.50 },
        { category: 'Health Insurance (Test)', amount: 450.75 },
        { category: 'Pension Insurance (Test)', amount: 880.20 },
        { category: 'Unemployment Insurance (Test)', amount: 150.00 },
        { category: 'Solidarity Surcharge (Test)', amount: 60.00 },
        { category: 'Church Tax (Test)', amount: 90.10 },
        { category: 'Nursing Care (Test)', amount: 75.30 },
    ];


    console.log("parsePdfDummy: Successfully returning dummy data:", dummyData);
    return dummyData;
}

export async function parsePayslip(
    fileContents: string | ArrayBuffer,
    fileType: string
)
: Promise<PayslipItem[]> {

    console.log(`parsePayslip (dummy version) called. FileType: ${fileType}`);
    if (fileContents instanceof ArrayBuffer) {
        console.log("Content is ArrayBuffer, calling parsePdfDummy...");
        return parsePdfDummy(fileContents);
    } else {
        console.warn(`parsePayslip (dummy version): Received unexpected content type: ${typeof fileContents}. Returning empty array.`);
        return [];
        // Or throw an error:
    }
}