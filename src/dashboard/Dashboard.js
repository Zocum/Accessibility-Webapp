import React, { useState } from "react";
import AccessibilityBar from "./AccessibilityBar.js";
import "./Dashboard.scss";

const Dashboard = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const analyzeWebsite = async () => {
    if (!url) return;

    setLoading(true);
    setError(null);

    try {
      // Updated to use the full backend URL
      const response = await fetch("http://localhost:5555/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ url }),
      });

      // Check for HTTP errors (4xx, 5xx)
      if (!response.ok) {
        // Try to get error details from response if possible
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error ||
            `Server error: ${response.status} ${response.statusText}`
        );
      }

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(`Failed to analyze website: ${err.message || "Unknown error"}`);
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <h1>Web Accessibility Analyzer</h1>

      <div className="url-input">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter website URL (e.g., https://www.bbc.com)"
          disabled={loading}
        />
        <button onClick={analyzeWebsite} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && (
        <div className="loading">
          Analyzing website accessibility... This may take a minute.
        </div>
      )}

      {results && (
        <div className="results">
          <h2>Results for: {results.url}</h2>

          <div className="score-section">
            <h3>Overall Accessibility Score</h3>
            <AccessibilityBar
              score={results.overallScore}
              label="Overall Score"
            />
          </div>

          <div className="wcag-section">
            <h3>WCAG Compliance</h3>
            <AccessibilityBar
              score={results.levelAScore}
              label="WCAG Level A"
            />
            <AccessibilityBar
              score={results.levelAAScore}
              label="WCAG Level AA"
            />
          </div>

          <div className="issues-section">
            <h3>Detected Issues</h3>
            {results.issues.length > 0 ? (
              <ul className="issues-list">
                {results.issues.map((issue, index) => (
                  <li
                    key={index}
                    className={`issue ${issue.level.toLowerCase()}`}
                  >
                    <span className="issue-level">{issue.level}</span>
                    <span className="issue-name">{issue.name}</span>
                    <p className="issue-description">{issue.description}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No accessibility issues detected!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
