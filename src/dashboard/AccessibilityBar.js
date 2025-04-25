import React from "react";
import "./AccessibilityBar.scss";

const AccessibilityBar = ({ score, label }) => {
  // Convert score to percentage (0-100)
  const percentage = Math.round(score * 100);

  return (
    <div className="accessibility-bar">
      <div className="bar-label">{label}</div>
      <div className="bar-container">
        <div
          className="bar-fill"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, 
              ${percentage < 50 ? "red" : "orange"} ${
              percentage < 50 ? "0%" : "50%"
            }, 
              ${percentage > 50 ? "green" : "orange"} 100%)`,
          }}
        />
        <span className="bar-percentage">{percentage}%</span>
      </div>
    </div>
  );
};

export default AccessibilityBar;
