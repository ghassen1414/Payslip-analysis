import React, { useCallback, useState, useRef } from "react";
import { parsePayslip, PayslipItem } from "../utils/parser";

interface UploadAreaProps {
  onDataParsed: (data: PayslipItem[], fileName: string) => void;
  onError: (error: string, fileName: string | null) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onDataParsed, onError }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const fileNameForProcessing = file.name;
      setCurrentFileName(fileNameForProcessing); // Show selected file name immediately
      setIsLoading(true);
      onError("", fileNameForProcessing);

      const reader = new FileReader();

      reader.onload = async (e) => {
        const content = e.target?.result;
        if (!content) {
          onError("Could not read file content.", fileNameForProcessing);
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        try {
          let parsedData: PayslipItem[]; // Declare parsedData
          if (content instanceof ArrayBuffer) {
            parsedData = await parsePayslip(content, file.type);
          } else {
            throw new Error("Invalid file content type. Expected ArrayBuffer.");
          }
          onDataParsed(parsedData, fileNameForProcessing);
        } catch (err) {
          onError(
            err instanceof Error
              ? err.message
              : "An unknown parsing error occurred.",
            fileNameForProcessing
          );
        } finally {
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };

      reader.onerror = () => {
        onError("Failed to read file.", fileNameForProcessing);
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      };

      if (file.type === "application/pdf") {
        reader.readAsArrayBuffer(file);
      } else if (
        file.type === "text/csv" ||
        file.name.toLowerCase().endsWith(".csv")
      ) {
        reader.readAsText(file, "UTF-8");
      } else {
        onError(
          `Unsupported file type: ${
            file.type || "Unknown"
          }. Please upload a PDF or CSV file.`,
          fileNameForProcessing
        );
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [onDataParsed, onError]
  );

  return (
    <div className="upload-area-container">
      {" "}
      {/* Use className */}
      <label htmlFor="payslip-upload">Select Payslip File (.pdf, .csv)</label>
      <input
        ref={fileInputRef}
        id="payslip-upload"
        type="file"
        accept=".pdf,.csv"
        onChange={handleFileChange}
        disabled={isLoading}
        // style={{ display: 'none' }} // Input is hidden by default from CSS
      />
      <button
        type="button" // Good practice for buttons not submitting forms
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="upload-button" // Use className
      >
        {isLoading ? "Processing..." : "Choose File"}
      </button>
      {currentFileName && !isLoading && (
        <p className="file-info">Selected: {currentFileName}</p>
      )}
      {isLoading && <p className="loading-message">Analyzing payslip...</p>}
    </div>
  );
};

export default UploadArea;
