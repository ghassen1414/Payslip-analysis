import React, { useState, useCallback } from "react";
import UploadArea from "./components/UploadArea";
import PieChartDisplay from "./components/PieChartDisplay";
import { PayslipItem } from "./utils/parser";
import ExplanationBox from "./components/ExplanationBox";

const App: React.FC = () => {
  const [payslipData, setPayslipData] = useState<PayslipItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDataParsed = useCallback((data: PayslipItem[], name: string) => {
    console.log("Parsed Data:", data);
    if (data.length === 0) {
      setError(
        "The application couldn't find recognizable financial data in this PDF. This can happen if the document is a scanned image or has a very unusual format. Please try another text-based payslip document."
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
        <p>Upload your payslip (PDF Only) to see a breakdown of deductions.</p>
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
          <h2>Analysis for: {fileName}</h2>
          <PieChartDisplay items={payslipData} />
          <ExplanationBox items={payslipData} />
        </div>
      )}
      {payslipData.length === 0 && !error && (
        <p className="placeholder-text">
          {" "}
          Upload a payslip PDF to begin analysis.
        </p>
      )}
    </div>
  );
};

export default App;
