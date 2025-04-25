import React, { useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import "./Dashboard.scss";

const AccessibilityCrawler = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [expandedAudits, setExpandedAudits] = useState({});
  const [debugMode, setDebugMode] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);

  // Connect to the backend API
  const analyzeUrl = async () => {
    setLoading(true);
    setError(null);

    try {
      // Make a real API call to our backend service
      const response = await fetch("http://localhost:5555/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze URL");
      }

      const result = await response.json();
      setResults(result);

      // Store the raw API response for debugging
      setApiResponse(result);
    } catch (err) {
      setError("Failed to analyze URL. Please check the URL and try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAudit = (level, id) => {
    const key = `${level}-${id}`;
    setExpandedAudits((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const renderAuditDetails = (audit, level) => {
    const key = `${level}-${audit.id}`;
    const isExpanded = expandedAudits[key];

    return (
      <div key={audit.id} className="accessibility-crawler__audit">
        <div
          className="accessibility-crawler__audit-header"
          onClick={() => toggleAudit(level, audit.id)}
        >
          <div className="accessibility-crawler__audit-header-content">
            <AlertCircle
              className="accessibility-crawler__audit-header-content-icon"
              size={20}
            />
            <div>
              <h4 className="accessibility-crawler__audit-header-content-text-title">
                {audit.title}
              </h4>
              <p className="accessibility-crawler__audit-header-content-text-id">
                {audit.id}
                {audit.displayValue ? ` - ${audit.displayValue}` : ""}
              </p>
            </div>
          </div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {isExpanded && (
          <div className="accessibility-crawler__audit-content">
            <p className="accessibility-crawler__audit-content-description">
              {audit.description}
            </p>

            {audit.details &&
            audit.details.items &&
            audit.details.items.length > 0 ? (
              <div className="accessibility-crawler__audit-content-elements">
                <h5 className="accessibility-crawler__audit-content-elements-title">
                  Affected Elements:
                </h5>
                <ul className="accessibility-crawler__audit-content-elements-list">
                  {audit.details.items.map((item, i) => (
                    <li
                      key={i}
                      className="accessibility-crawler__audit-content-elements-item"
                    >
                      {/* Element info with good formatting */}
                      {item.node && (
                        <div>
                          {item.node.nodeLabel && (
                            <div className="accessibility-crawler__audit-content-elements-item-label">
                              Element: "{item.node.nodeLabel}"
                            </div>
                          )}

                          {item.node.selector && (
                            <div className="accessibility-crawler__audit-content-elements-item-selector">
                              <span className="accessibility-crawler__audit-content-elements-item-selector-label">
                                Selector:{" "}
                              </span>
                              <code className="accessibility-crawler__audit-content-elements-item-selector-code">
                                {item.node.selector}
                              </code>
                            </div>
                          )}

                          {item.node.snippet && (
                            <div className="accessibility-crawler__audit-content-elements-item-html">
                              <span className="accessibility-crawler__audit-content-elements-item-html-label">
                                HTML:{" "}
                              </span>
                              <code className="accessibility-crawler__audit-content-elements-item-html-code">
                                {item.node.snippet}
                              </code>
                            </div>
                          )}

                          {item.node.explanation && (
                            <div className="accessibility-crawler__audit-content-elements-item-explanation">
                              {item.node.explanation}
                            </div>
                          )}

                          {/* Color contrast specific information */}
                          {audit.id === "color-contrast" &&
                            item.node.explanation && (
                              <div className="accessibility-crawler__audit-content-elements-item-contrast">
                                {(() => {
                                  // Extract contrast information from explanation text
                                  const contrastMatch =
                                    item.node.explanation.match(
                                      /contrast of (\d+\.\d+) \(foreground color: (#\w+), background color: (#\w+)/
                                    );
                                  if (contrastMatch) {
                                    const [_, contrast, fgColor, bgColor] =
                                      contrastMatch;
                                    return (
                                      <div>
                                        <div className="accessibility-crawler__audit-content-elements-item-contrast-ratio">
                                          <span className="accessibility-crawler__audit-content-elements-item-contrast-ratio-label">
                                            Contrast ratio:
                                          </span>
                                          <span
                                            className={
                                              parseFloat(contrast) < 4.5
                                                ? "accessibility-crawler__audit-content-elements-item-contrast-ratio-value--insufficient"
                                                : "accessibility-crawler__audit-content-elements-item-contrast-ratio-value"
                                            }
                                          >
                                            {contrast}
                                          </span>
                                          <span className="accessibility-crawler__audit-content-elements-item-contrast-ratio-requirement">
                                            (minimum required: 4.5:1)
                                          </span>
                                        </div>
                                        <div className="accessibility-crawler__audit-content-elements-item-contrast-colors">
                                          <div>
                                            <span className="accessibility-crawler__audit-content-elements-item-contrast-colors-fg-label">
                                              Foreground
                                            </span>
                                            <div
                                              className="accessibility-crawler__audit-content-elements-item-contrast-colors-fg-swatch"
                                              style={{
                                                backgroundColor: fgColor,
                                              }}
                                              title={fgColor}
                                            ></div>
                                          </div>
                                          <div>
                                            <span className="accessibility-crawler__audit-content-elements-item-contrast-colors-bg-label">
                                              Background
                                            </span>
                                            <div
                                              className="accessibility-crawler__audit-content-elements-item-contrast-colors-bg-swatch"
                                              style={{
                                                backgroundColor: bgColor,
                                              }}
                                              title={bgColor}
                                            ></div>
                                          </div>
                                          <div className="accessibility-crawler__audit-content-elements-item-contrast-colors-preview">
                                            <span className="accessibility-crawler__audit-content-elements-item-contrast-colors-preview-label">
                                              Preview
                                            </span>
                                            <div
                                              className="accessibility-crawler__audit-content-elements-item-contrast-colors-preview-text"
                                              style={{
                                                color: fgColor,
                                                backgroundColor: bgColor,
                                              }}
                                            >
                                              Sample text
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                        </div>
                      )}

                      {/* Related nodes or sub-items */}
                      {item.subItems &&
                        item.subItems.items &&
                        item.subItems.items.length > 0 && (
                          <div className="accessibility-crawler__audit-content-elements-related">
                            <span className="accessibility-crawler__audit-content-elements-related-title">
                              Related elements:
                            </span>
                            <ul className="accessibility-crawler__audit-content-elements-related-list">
                              {item.subItems.items.map((subItem, j) => (
                                <li
                                  key={j}
                                  className="accessibility-crawler__audit-content-elements-related-item"
                                >
                                  {subItem.relatedNode &&
                                    subItem.relatedNode.nodeLabel && (
                                      <div className="accessibility-crawler__audit-content-elements-related-item-label">
                                        {subItem.relatedNode.nodeLabel}
                                      </div>
                                    )}
                                  {subItem.relatedNode &&
                                    subItem.relatedNode.selector && (
                                      <code className="accessibility-crawler__audit-content-elements-related-item-selector">
                                        {subItem.relatedNode.selector}
                                      </code>
                                    )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* Other item properties that might be useful */}
                      {item.expectedContrast && (
                        <div className="accessibility-crawler__audit-content-elements-other">
                          Expected contrast: {item.expectedContrast}, Actual:{" "}
                          {item.actualContrast}
                        </div>
                      )}

                      {item.missingAttrs && (
                        <div className="accessibility-crawler__audit-content-elements-other">
                          Missing attributes: {item.missingAttrs.join(", ")}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="accessibility-crawler__audit-content-empty">
                No additional details available
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="accessibility-crawler__results">
        <div className="accessibility-crawler__results-container">
          <div className="accessibility-crawler__results-header">
            <h2 className="accessibility-crawler__results-header-title">
              Accessibility Results
            </h2>
            <div>
              <span className="accessibility-crawler__results-header-timestamp">
                {new Date(results.timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="accessibility-crawler__results-url">
            <span className="accessibility-crawler__results-url-label">
              URL:
            </span>{" "}
            <a
              href={results.url}
              target="_blank"
              rel="noopener noreferrer"
              className="accessibility-crawler__results-url-link"
            >
              {results.url}
              <ExternalLink
                className="accessibility-crawler__results-url-link-icon"
                size={14}
              />
            </a>
          </div>

          <div className="accessibility-crawler__results-issues">
            <div className="accessibility-crawler__results-issues-column">
              <div className="accessibility-crawler__results-issues-level-a">
                <h3 className="accessibility-crawler__results-issues-level-a-title">
                  <AlertTriangle
                    className="accessibility-crawler__results-issues-level-a-title-icon"
                    size={18}
                  />
                  WCAG Level A Issues
                  <span className="accessibility-crawler__results-issues-level-a-title-badge">
                    {results.levelA.totalIssues}
                  </span>
                </h3>
                <div className="accessibility-crawler__results-issues-level-a-list">
                  {results.levelA.issues.map((audit) =>
                    renderAuditDetails(audit, "A")
                  )}
                </div>
              </div>
            </div>

            <div className="accessibility-crawler__results-issues-column">
              <div className="accessibility-crawler__results-issues-level-aa">
                <h3 className="accessibility-crawler__results-issues-level-aa-title">
                  <AlertTriangle
                    className="accessibility-crawler__results-issues-level-aa-title-icon"
                    size={18}
                  />
                  WCAG Level AA Issues
                  <span className="accessibility-crawler__results-issues-level-aa-title-badge">
                    {results.levelAA.totalIssues}
                  </span>
                </h3>
                <div className="accessibility-crawler__results-issues-level-aa-list">
                  {results.levelAA.issues.map((audit) =>
                    renderAuditDetails(audit, "AA")
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="accessibility-crawler">
      <div className="accessibility-crawler__header">
        <h1 className="accessibility-crawler__header-title">
          Web Accessibility Crawler
        </h1>
        <p className="accessibility-crawler__header-description">
          Analyze web pages for accessibility issues based on WCAG guidelines.
        </p>
      </div>

      <div className="accessibility-crawler__input-section">
        <div className="accessibility-crawler__input-section-form">
          <div className="accessibility-crawler__input-section-form-group">
            <label
              htmlFor="url-input"
              className="accessibility-crawler__input-section-form-label"
            >
              Enter URL to analyze
            </label>
            <input
              id="url-input"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="accessibility-crawler__input-section-form-input"
            />
          </div>
          <div className="accessibility-crawler__input-section-form-button-group">
            <button
              onClick={analyzeUrl}
              disabled={loading || !url}
              className="accessibility-crawler__input-section-form-button"
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>

            <div className="accessibility-crawler__input-section-form-debug">
              <input
                type="checkbox"
                id="debug-mode"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="accessibility-crawler__input-section-form-debug-checkbox"
              />
              <label
                htmlFor="debug-mode"
                className="accessibility-crawler__input-section-form-debug-label"
              >
                Debug Mode
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="accessibility-crawler__error">
            <AlertCircle
              className="accessibility-crawler__error-icon"
              size={18}
            />
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="accessibility-crawler__loading">
          <div className="accessibility-crawler__loading-spinner"></div>
          <p className="accessibility-crawler__loading-text">
            Analyzing accessibility of {url}...
          </p>
        </div>
      ) : (
        <>
          {renderResults()}

          {/* Debug Data Display */}
          {debugMode && apiResponse && (
            <div className="accessibility-crawler__debug">
              <div className="accessibility-crawler__debug-container">
                <h2 className="accessibility-crawler__debug-title">
                  Debug: Raw API Response
                </h2>
                <div className="accessibility-crawler__debug-content">
                  <pre className="accessibility-crawler__debug-content-pre">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AccessibilityCrawler;
