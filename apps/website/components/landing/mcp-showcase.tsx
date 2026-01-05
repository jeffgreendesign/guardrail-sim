import type { ReactNode } from 'react';

export function MCPShowcase(): ReactNode {
  return (
    <section className="mcp-showcase">
      <h2 className="section-title">MCP Tools</h2>
      <p className="section-subtitle">Test policies conversationally with AI assistants.</p>
      <div className="mcp-tools-grid">
        <div className="mcp-tool">
          <code className="mcp-tool-name">evaluate_policy</code>
          <p className="mcp-tool-description">
            Evaluate a proposed discount against the active pricing policy
          </p>
        </div>
        <div className="mcp-tool">
          <code className="mcp-tool-name">get_policy_summary</code>
          <p className="mcp-tool-description">
            Get a human-readable summary of the active policy rules
          </p>
        </div>
        <div className="mcp-tool">
          <code className="mcp-tool-name">get_max_discount</code>
          <p className="mcp-tool-description">
            Calculate the maximum allowed discount for a given order
          </p>
        </div>
      </div>
    </section>
  );
}
