import * as pdfjs from 'pdfjs-dist';
const { getDocument, GlobalWorkerOptions } = pdfjs;
const pdfjsVersion = '3.11.174'; // Your specified version
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

export interface PayslipItem {
  category: string;
  amount: number;
}

// Category mapping - CRITICAL: Keys must EXACTLY match text in your PDF's fullText output
const categoryMapping: { [key: string]: string } = {
    '3. Bruttoarbeitslohn einschl. Sachbezüge': 'Gross Salary',
    '4. Einbehaltene Lohnsteuer von 3.': 'Income Tax',
    '5. Einbehaltener Solidaritätszuschlag von 3.': 'Solidarity Surcharge', // Will be "------- --" in your test PDF
    '6. Einbehaltene Kirchensteuer des Arbeitnehmers von 3.': 'Church Tax', // Will be "------- --" in your test PDF
    '22. Arbeitgeber- Anteil/ -Zuschuss a) zur gesetzlichen Rentenversicherung': 'Employer Pension Contribution', // Blank in your test PDF
    '23. Arbeitnehmer- anteil a) zur gesetzlichen Rentenversicherung': 'Pension Insurance', // Blank in your test PDF
    '25. Arbeitnehmerbeiträge zur gesetzlichen Krankenversicherung': 'Health Insurance', // Blank in your test PDF
    '26. Arbeitnehmerbeiträge zur sozialen Pflegeversicherung': 'Nursing Care Insurance', // Blank in your test PDF
    '27. Arbeitnehmerbeiträge zur Arbeitslosenversicherung': 'Unemployment Insurance', // Blank in your test PDF
    '28. Beiträge zur privaten Kranken- und Pflege-Pflicht- versicherung oder Mindestvorsorgepauschale': 'Private Health/Nursing Insurance',
};

/**
 * Parses EUR and Ct string parts into a single numerical value.
 * Returns 0 if input is a placeholder like "-------" or invalid.
 */
function parseGermanAmount(eurString: string | undefined, ctString: string | undefined): number {
    // If eurString itself is the placeholder "-------" or similar, it's 0.
    if (!eurString || eurString.trim().startsWith('-')) {
        return 0;
    }
    try {
        const cleanedEurString = eurString.replace(/\./g, ''); // "1.234" -> "1234"
        const eurValue = parseFloat(cleanedEurString);
        // If ctString is placeholder "--" or missing, treat as 0 cents.
        const ctValue = (ctString && !ctString.trim().startsWith('-') && ctString.trim() !== "") ? parseFloat(ctString) : 0;

        if (isNaN(eurValue) || isNaN(ctValue)) {
            console.warn(`parseGermanAmount: Failed to parse numbers: EUR='${eurString}', Ct='${ctString}'`);
            return 0; // Treat parsing failure as 0 for this context
        }
        return Math.abs(eurValue + (ctValue / 100)); // Return absolute value
    } catch (error) {
        console.error(`parseGermanAmount: Error for EUR='${eurString}', Ct='${ctString}'`, error);
        return 0; // Treat error as 0
    }
}

/**
 * Parses the Lohnsteuerbescheinigung PDF content.
 */
async function parseLohnsteuerbescheinigung(pdfContent: ArrayBuffer): Promise<PayslipItem[]> {
    console.log("--- parseLohnsteuerbescheinigung: Starting String-Based Parsing ---");
    const itemsMap = new Map<string, number>();

    try {
        const loadingTask = getDocument({ data: pdfContent });
        const pdf = await loadingTask.promise;
        console.log(`parseLohnsteuerbescheinigung: PDF Loaded - ${pdf.numPages} page(s).`);

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(' ');
            if (pdf.numPages > 1 && i < pdf.numPages) {
                fullText += ' PAGE_BREAK ';
            }
        }
        fullText = fullText.replace(/\s+/g, ' ').trim(); // Normalize all whitespace

        console.log("--- parseLohnsteuerbescheinigung: EXTRACTED PDF TEXT (Normalized Single Line) ---");
        console.log(fullText); // Log the entire fullText for debugging
        console.log("---------------------------------------------------------------------------------");

        // Regex to find EUR and Ct values.
        // Group 1: EUR part (numbers OR 3+ dashes for placeholders like "-------")
        // Group 2: Ct part (1-2 numbers OR 2 dashes for placeholders like "--")
        const amountPairRegex = /((?:\d{1,3}(?:\.\d{3})*|\d+)|-{3,})\s+((?:\d{1,2})|-{2})\b/;

        for (const [keywordPhrase, mappedCategory] of Object.entries(categoryMapping)) {
            const escapedKeyword = keywordPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const keywordRegex = new RegExp(escapedKeyword.replace(/\s+/g, '\\s+'), 'i');

            const keywordMatchResult = keywordRegex.exec(fullText); // Search for keyword in fullText

            if (keywordMatchResult) {
                const keywordEndIndex = keywordMatchResult.index + keywordMatchResult[0].length;
                const MAX_CHARS_TO_SEARCH_FOR_AMOUNT = 60; // Tunable: how far to look for amount
                const textToSearchForAmount = fullText.substring(keywordEndIndex, keywordEndIndex + MAX_CHARS_TO_SEARCH_FOR_AMOUNT);

                console.log(`Found Keyword "${keywordPhrase}". Searching for amount in window [${keywordEndIndex}-${keywordEndIndex + MAX_CHARS_TO_SEARCH_FOR_AMOUNT}]: "${textToSearchForAmount.substring(0, Math.min(textToSearchForAmount.length, 70))}..."`);

                const amountMatchResult = amountPairRegex.exec(textToSearchForAmount); // Apply regex to the window

                if (amountMatchResult && amountMatchResult[1] && amountMatchResult[2]) {
                    const eurStr = amountMatchResult[1]; // This can be numbers or "-------"
                    const ctStr = amountMatchResult[2];  // This can be numbers or "--"
                    
                    // Check if the extracted EUR string is a placeholder BEFORE parsing
                    if (eurStr.trim().startsWith('-')) {
                        console.log(`PLACEHOLDER DETECTED for Category='${mappedCategory}', Keyword='${keywordPhrase}' (Raw EUR: '${eurStr}', Raw Ct: '${ctStr}') - IGNORING.`);
                        // Do NOT add to itemsMap, effectively ignoring it
                    } else {
                        // Only parse if eurStr is not a placeholder
                        const amount = parseGermanAmount(eurStr, ctStr);
                        if (amount > 0 || mappedCategory.toLowerCase().includes('gross salary')) {
                            console.log(`SUCCESS: Category='${mappedCategory}', Keyword='${keywordPhrase}', Amount=${amount} (Raw EUR: '${eurStr}', Raw Ct: '${ctStr}')`);
                            itemsMap.set(mappedCategory, (itemsMap.get(mappedCategory) || 0) + amount);
                        } else {
                            // Amount was parsed to 0 from actual numbers (e.g., "0 00") and not Gross Salary
                            console.log(`INFO: Category='${mappedCategory}', Keyword='${keywordPhrase}', Amount parsed to 0 from numbers (Raw EUR: '${eurStr}', Raw Ct: '${ctStr}') - IGNORING.`);
                        }
                    }
                } else {
                    // This means amountPairRegex didn't find a match in the window.
                    // This is expected for lines where amounts are blank or too far.
                    console.log(`INFO: Keyword='${keywordPhrase}' found, but no EUR/Ct pair (numeric or placeholder) found by regex in its search window: "${textToSearchForAmount.substring(0, Math.min(textToSearchForAmount.length, 70))}..."`);
                }
            } else {
                console.log(`Keyword "${keywordPhrase}" NOT FOUND in fullText.`);
            }
        }

        if (itemsMap.size === 0) {
            console.warn("parseLohnsteuerbescheinigung: No valid numerical items extracted. Review extracted text, category mappings, and regex logic.");
        }
        return Array.from(itemsMap, ([category, amount]) => ({ category, amount }));

    } catch (error: any) {
        console.error("Error during Lohnsteuerbescheinigung parsing:", error);
        // Specific error handling
        if (error.name === 'PasswordException') throw new Error('The PDF is password protected.');
        if (error.name === 'InvalidPDFException') throw new Error('The PDF file is invalid or corrupted.');
        // Generic re-throw
        throw new Error(`Failed to process PDF: ${error.message || 'Unknown PDF processing error'}`);
    }
}


// Dummy function for UI testing if needed (not primary focus now)
async function parsePdfDummy(_pdfContent: ArrayBuffer): Promise<PayslipItem[]> {
    console.log("parsePdfDummy called. Returning hardcoded test data...");
    await new Promise(resolve => setTimeout(resolve, 500));
    const dummyData: PayslipItem[] = [
        { category: 'Income Tax (Test)', amount: 1000 },
        { category: 'Health Insurance (Test)', amount: 300 },
    ];
    console.log("parsePdfDummy: Successfully returning dummy data:", dummyData);
    return dummyData;
}

// Main exported function
export async function parsePayslip(
    fileContents: string | ArrayBuffer,
    fileType: string
): Promise<PayslipItem[]> {

    const USE_REAL_PARSER = true; // Switch to true to use your actual Lohnsteuerbescheinigung parser

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
        return []; // Or throw new Error for unsupported types
    }
}