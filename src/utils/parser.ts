import * as pdfjs from 'pdfjs-dist';
const { getDocument, GlobalWorkerOptions } = pdfjs;
const pdfjsVersion = '3.11.174'; 
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

export interface PayslipItem {
  category: string;
  amount: number;
}


const categoryMapping: { [key: string]: string } = {
    '3. Bruttoarbeitslohn einschl. Sachbezüge': 'Gross Income',
    '4. Einbehaltene Lohnsteuer von 3.': 'Income Tax',
    '5. Einbehaltener Solidaritätszuschlag von 3.': 'Solidarity Surcharge',
    '6. Einbehaltene Kirchensteuer des Arbeitnehmers von 3.': 'Church Tax',
    '22. Arbeitgeber- Anteil/ -Zuschuss a) zur gesetzlichen Rentenversicherung': 'Employer Pension Contribution',
    '23. Arbeitnehmer- anteil a) zur gesetzlichen Rentenversicherung': 'Pension Insurance',
    '25. Arbeitnehmerbeiträge zur gesetzlichen Krankenversicherung': 'Health Insurance',
    '26. Arbeitnehmerbeiträge zur sozialen Pflegeversicherung': 'Nursing Care Insurance',
    '27. Arbeitnehmerbeiträge zur Arbeitslosenversicherung': 'Unemployment Insurance',
    '28. Beiträge zur privaten Kranken- und Pflege-Pflicht- versicherung oder Mindestvorsorgepauschale': 'Private Health and Nursing Insurance',
    '17. Steuerfreie Arbeitgeberleistungen, die auf die Entfernungspauschale anzurechnen sind': 'Tax-Free Employer Contributions for Commuting',
    '18. Pauschal mit 15 % besteuerte Arbeitgeberleistungen für Fahrten zwischen Wohnung und erster Tätigkeitsstätte': 'Flat-Taxed Commuting Benefits (15%)',
    '20. Steuerfreie Verpflegungszuschüsse bei Auswärtstätigkeit': 'Tax-Free Meal Allowance',
    '21. Steuerfreie Arbeitgeberleistungen bei doppelter Haushaltsführung': 'Tax-Free Employer Contributions for Double Households',
    '24. Steuerfreie Arbeitgeber- zuschüsse a) zur gesetzlichen Krankenversicherung': 'Employer Subsidy to Public Health Insurance',
    '24. Steuerfreie Arbeitgeber- zuschüsse b) zur privaten Krankenversicherung': 'Employer Subsidy to Private Health Insurance',
    '24. Steuerfreie Arbeitgeber- zuschüsse c) zur gesetzlichen Pflegeversicherung': 'Employer Subsidy to Long-Term Care Insurance',
    '8. In 3. enthaltene Versorgungsbezüge': 'Pension Payments (Versorgungsbezüge)',
    '15. Leistungen, die dem Progressionsvorbehalt unterliegen (z.B. Lohnersatzleistungen)': 'Substitute Wage Payments (Lohnersatzleistungen)',
    '16. Steuerfreier Arbeitslohn nach a) Doppelbesteuerungsabkommen': 'Tax-Free Income under Double Taxation Agreement',
    '10. Arbeitslohn für mehrere Kalenderjahre, Entschädi-, gungen z.B. Abfindungen (in 3. enthalten, ohne 9.)': 'Multi-Year Pension or Severance Pay',
    '32. Sterbegeld; Kapitalauszahlungen/Abfindungen und Nachzahlungen von Versorgungsbezügen': 'Death Benefits / Capital Payments / Pension Back Payments',
    '34. Freibetrag DBA Türkei': 'DBA Turkey Exemption',
};

function parseGermanAmount(eurString: string | undefined, ctString: string | undefined): number {
    if (!eurString || eurString.trim().startsWith('-')) {
        return 0;
    }
    try {
        const cleanedEurString = eurString.replace(/\./g, ''); // "1.234" -> "1234"
        const eurValue = parseFloat(cleanedEurString);
        const ctValue = (ctString && !ctString.trim().startsWith('-') && ctString.trim() !== "") ? parseFloat(ctString) : 0;

        if (isNaN(eurValue) || isNaN(ctValue)) {
            console.warn(`parseGermanAmount: Failed to parse numbers: EUR='${eurString}', Ct='${ctString}'`);
            return 0; 
        }
        return Math.abs(eurValue + (ctValue / 100)); 
    } catch (error) {
        console.error(`parseGermanAmount: Error for EUR='${eurString}', Ct='${ctString}'`, error);
        return 0; 
    }
}


//Parses the Lohnsteuerbescheinigung PDF content.
async function parseLohnsteuerbescheinigung(pdfContent: ArrayBuffer): Promise<PayslipItem[]> {
    console.log("--- parseLohnsteuerbescheinigung: Starting String-Based Parsing ---");
    const itemsMap = new Map<string, number>();

    try {
        const loadingTask = getDocument({ data: pdfContent });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(' ');
            if (pdf.numPages > 1 && i < pdf.numPages) {
                fullText += ' PAGE_BREAK ';
            }
        }
        fullText = fullText.replace(/\s+/g, ' ').trim();

        console.log("--- parseLohnsteuerbescheinigung: EXTRACTED PDF TEXT (Normalized Single Line) ---");
        console.log(fullText);
        console.log("---------------------------------------------------------------------------------");

        const amountOrPlaceholderRegex = /((?:\d[\d\.]*|\d+)|-{3,})\s+((?:\d{1,2})|-{2})\b/;


        for (const [keywordPhrase, mappedCategory] of Object.entries(categoryMapping)) {
            const escapedKeyword = keywordPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const keywordRegex = new RegExp(escapedKeyword.replace(/\s+/g, '\\s+'), 'i');
            const keywordMatchResult = keywordRegex.exec(fullText);

            if (keywordMatchResult) {
                const keywordEndIndex = keywordMatchResult.index + keywordMatchResult[0].length;
                const MAX_CHARS_TO_SEARCH_FOR_AMOUNT = 60;
                const textToSearchForAmount = fullText.substring(keywordEndIndex, keywordEndIndex + MAX_CHARS_TO_SEARCH_FOR_AMOUNT);

                console.log(`Found Keyword "${keywordPhrase}". Searching in window: "${textToSearchForAmount.substring(0, 70)}..."`);

                const matchResult = amountOrPlaceholderRegex.exec(textToSearchForAmount);

                if (matchResult && matchResult[1] && matchResult[2]) {
                    const eurStr = matchResult[1].trim();
                    const ctStr = matchResult[2].trim();

                    if (eurStr.startsWith('-')) { // Check if it's a placeholder
                        console.log(`PLACEHOLDER DETECTED for Category='${mappedCategory}' (Raw EUR: '${eurStr}', Raw Ct: '${ctStr}') - IGNORING.`);

                    } else {

                        const amount = parseGermanAmount(eurStr, ctStr);
                        if (amount > 0 || mappedCategory.toLowerCase().includes('gross salary')) {
                            console.log(`SUCCESS: Category='${mappedCategory}', Amount=${amount} (Raw EUR: '${eurStr}', Raw Ct: '${ctStr}')`);
                            itemsMap.set(mappedCategory, (itemsMap.get(mappedCategory) || 0) + amount);
                        } else {
                            console.log(`INFO: Category='${mappedCategory}', Amount parsed to 0 from numbers (Raw EUR: '${eurStr}', Raw Ct: '${ctStr}') - IGNORING.`);
                        }
                    }
                } else {
                    console.log(`INFO: Keyword='${keywordPhrase}' found, but NO amount OR placeholder pattern matched by regex in window: "${textToSearchForAmount.substring(0, 70)}..."`);
                    console.log(`   Window content for failed regex match on "${keywordPhrase}": >${textToSearchForAmount}<`);
                }
            } else {
                console.log(`Keyword "${keywordPhrase}" NOT FOUND in fullText.`);
            }
        }

        // ... (rest of function)
        if (itemsMap.size === 0) {
            console.warn("parseLohnsteuerbescheinigung: No valid numerical items extracted...");
        }
        return Array.from(itemsMap, ([category, amount]) => ({ category, amount }));

    } catch (error: any) {
        // ... (error handling)
        console.error("Error during Lohnsteuerbescheinigung parsing:", error);
        if (error.name === 'PasswordException') throw new Error('The PDF is password protected.');
        if (error.name === 'InvalidPDFException') throw new Error('The PDF file is invalid or corrupted.');
        throw new Error(`Failed to process PDF: ${error.message || 'Unknown PDF processing error'}`);
    }
}

// Dummy function (for UI testing purposes)
async function parsePdfDummy(_pdfContent: ArrayBuffer): Promise<PayslipItem[]> {
    console.log("parsePdfDummy called...");
    await new Promise(resolve => setTimeout(resolve, 500));
    const dummyData: PayslipItem[] = [
        { category: 'Dummy Income Tax', amount: 120.50 },
        { category: 'Dummy Health Ins.', amount: 80.75 },
    ];
    return dummyData;
}

// Main exported function
export async function parsePayslip(
    fileContents: string | ArrayBuffer,
    fileType: string
): Promise<PayslipItem[]> {

    const USE_REAL_PARSER = true; // Set to true to use the Lohnsteuerbescheinigung parser

    console.log(`parsePayslip called. FileType: ${fileType}. Using ${USE_REAL_PARSER ? 'REAL' : 'DUMMY'} parser.`);

    if (fileContents instanceof ArrayBuffer) {
        if (USE_REAL_PARSER){
            console.log("Content is ArrayBuffer, calling parseLohnsteuerbescheinigung for REAL parsing...");
            return parseLohnsteuerbescheinigung(fileContents);
        } else {
            console.log("Content is ArrayBuffer, DUMMY parser selected.");
            return parsePdfDummy(fileContents);
        }
    } else {
        console.warn(`parsePayslip: Received unexpected content type: ${typeof fileContents}. Returning empty array.`);
        return [];
    }
}