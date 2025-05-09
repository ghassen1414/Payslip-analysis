import React, { useState, useCallback } from "react";
import UploadArea from "./components/UploadArea";
import PieChartDisplay from "./components/PieChartDisplay";
import { PayslipItem } from "./utils/parser";

const App: React.FC = () => {
  const [payslipData, setPayslipData] = useState<PayslipItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDataParsed = useCallback((data: PayslipItem[], name: string) => {
    console.log("Parsed Data:", data);
    if (data.length === 0) {
      setError(
        "Could not parse relevant data from the file. Please check the file format and content, ensuring standard German payslip terms are present."
      );
      setPayslipData([]);
    } else {
      setPayslipData(data);
      setError(null);
    }
    setFileName(name);
  }, []);

  const handleParseError = useCallback(
    (errorMessage: string, name: string | null) => {
      console.error("Parsing Error:", errorMessage);
      setError(
        `Error parsing file${name ? ` (${name})` : ""}: ${errorMessage}`
      );
      setPayslipData([]);
      setFileName(name);
    },
    []
  );

  return (
    <div className="app-container">
      {" "}
      {/* Use className for app container */}
      <header>
        <h1>German Payslip Analyzer</h1>
        <p>
          Upload your payslip (PDF or CSV) to see a breakdown of deductions.
        </p>
      </header>
      <UploadArea onDataParsed={handleDataParsed} onError={handleParseError} />
      {error && (
        <div className="error-message">
          {" "}
          {/* Use className for error message */}
          <p>{error}</p>
        </div>
      )}
      {payslipData.length > 0 && fileName && (
        <div className="analysis-section">
          {" "}
          {/* Optional: class for this section */}
          <h2>Analysis for: {fileName}</h2>
          <PieChartDisplay items={payslipData} />
        </div>
      )}
      {payslipData.length === 0 && !error && (
        <p className="placeholder-text">
          {" "}
          {/* Use className for placeholder */}
          Upload a payslip PDF or CSV file to begin analysis (Upload any pdf
          file this is a test version).
        </p>
      )}
    </div>
  );
};

export default App;
