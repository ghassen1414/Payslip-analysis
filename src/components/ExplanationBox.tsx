import React from "react";
import { PayslipItem } from "../utils/parser";
import { categoryExplanations } from "../utils/explanations";

interface ExplanationBoxProps {
  items: PayslipItem[];
}

const ExplanationBox: React.FC<ExplanationBoxProps> = ({ items }) => {
  const itemsToExplain = items.filter(
    (item) => !item.category.toLowerCase().includes("gross")
  );

  return (
    <div className="explanation-container">
      <h2>What do these mean?</h2>
      <ul className="explanation-list">
        {itemsToExplain.map((item, index) => (
          <li key={index} className="explanation-item">
            <strong className="explanation-category">{item.category}:</strong>
            <p className="explanation-text">
              {categoryExplanations[item.category] ||
                "No explanation available for this category."}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ExplanationBox;
