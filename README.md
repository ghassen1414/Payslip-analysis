# German Payslip Analyzer

## Introduction

The German Payslip Analyzer is a web application built with React and TypeScript, designed to help individuals in Germany demystify their payslips. By uploading a PDF version of their payslip (currently optimized for the annual "Lohnsteuerbescheinigung"), users can get a clear, visual breakdown of their salary components and deductions. The application parses key financial categories such as gross salary, income tax, social security contributions, and others, presenting them in an easy-to-understand pie chart with an interactive legend.

This tool aims to provide clarity and insight into personal finances, especially for new citizens or anyone looking to better understand the structure of German payroll.

---

## Implementation

### Tech Stack

*   **Frontend Framework:** React (with TypeScript for type safety)
*   **PDF Parsing Library:** Mozilla's pdf.js (`pdfjs-dist`)
*   **Charting Library:** Recharts
*   **Build Tool / Development Server:** Vite
*   **Styling:** Global CSS (`src/index.css`)
*   **Language:** TypeScript, HTML, CSS

### Architecture

The application follows a component-based architecture typical of React applications.

1.  **`main.tsx`**: The entry point that bootstraps the React application and renders the main `App` component into the DOM.
2.  **`App.tsx`**: The root component that manages the overall application state, including the parsed payslip data and any errors. It orchestrates the data flow between the upload mechanism and the chart display.
3.  **`components/UploadArea.tsx`**: A functional component responsible for:
    *   Rendering a file input for PDF uploads.
    *   Using `FileReader` to read the selected file's content.
    *   Invoking the `parsePayslip` utility to process the file.
    *   Communicating parsed data or errors back to the `App` component.
4.  **`utils/parser.ts`**: The core parsing engine.
    *   Initializes and configures `pdf.js`, including setting up its web worker (currently using a CDN-hosted worker for reliability).
    *   Defines the `PayslipItem` interface for structured data.
    *   Contains a `categoryMapping` to translate German payslip terms to standardized English categories.
    *   Implements `parsePdfInternal` (or similar function) which uses `pdf.js` to extract text from the PDF. This function then applies custom logic (e.g., regular expressions, keyword matching) to identify and extract relevant financial figures.
    *   Includes a helper function (`parseGermanAmount`) to convert German currency formats into numerical values.
    *   Exports the main `parsePayslip` function that is called by `UploadArea.tsx`.
5.  **`components/PieChartDisplay.tsx`**: A functional component that:
    *   Receives the array of parsed `PayslipItem` objects as props.
    *   Uses the `recharts` library to render a responsive pie chart.
    *   Filters and processes the data to show relevant deductions.
    *   Includes a legend and tooltips for enhanced data visualization.
6.  **`index.css`**: A global stylesheet providing a modern, clean, and responsive design for all components.

**Data Flow:**
`File Input (UploadArea)` → `FileReader (UploadArea)` → `parsePayslip (parser.ts)` → `Text Extraction (pdf.js)` → `Keyword/Amount Logic (parser.ts)` → `Parsed Data (App state)` → `Pie Chart (PieChartDisplay)`

---

## Usecase

### UI/UX

*   **Clean and Modern Interface:** The application features a minimalist design focused on ease of use.
*   **Responsive Layout:** The UI adapts smoothly to various screen sizes (desktop, tablet, mobile).
*   **Clear Call to Action:** A prominent "Choose File" button guides the user to upload their payslip.
*   **Informative Feedback:**
    *   Loading indicators are shown during file processing.
    *   Clear error messages are displayed if parsing fails or if the file is unsupported.
    *   The name of the uploaded file is displayed for context.
*   **Interactive Data Visualization:**
    *   A pie chart provides an immediate visual understanding of deduction proportions.
    *   Hovering over chart slices reveals tooltips with precise amounts and percentages.
    *   A detailed legend lists each category, its value, and its percentage of total deductions.
*   **Consistent Styling:** A unified color palette, font system, and spacing rules are applied across the application for a cohesive experience.

### User Story

**As a new resident in Germany,
**I want to upload my "Lohnsteuerbescheinigung" (annual tax certificate) PDF,
**So that I can quickly see a visual breakdown of my gross income, taxes, and social security contributions, helping me understand where my money goes and verify the details on my official documents.
