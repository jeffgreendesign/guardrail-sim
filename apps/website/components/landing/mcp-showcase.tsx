import type { ReactNode } from 'react';

export function MCPShowcase(): ReactNode {
  return (
    <section className="mcp-showcase">
      <h2 className="section-title">MCP Tools</h2>
      <p className="section-subtitle">Test policies conversationally with AI assistants.</p>
      <div className="mcp-tools-grid">
        <div className="mcp-tool">
          <code className="mcp-tool-name">evaluate_policy</code>
          <p className="mcp-tool-description">Test a scenario against policy constraints</p>
        </div>
        <div className="mcp-tool">
          <code className="mcp-tool-name">get_max_discount</code>
          <p className="mcp-tool-description">Calculate maximum allowed discount</p>
        </div>
        <div className="mcp-tool">
          <code className="mcp-tool-name">validate_policy</code>
          <p className="mcp-tool-description">Check if a policy definition is valid</p>
        </div>
        <div className="mcp-tool">
          <code className="mcp-tool-name">list_constraints</code>
          <p className="mcp-tool-description">List all available constraint types</p>
        </div>
      </div>
    </section>
  );
}
