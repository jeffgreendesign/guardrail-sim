import type { ReactNode } from 'react';

/** Every tool the MCP server registers, in the order it registers them. */
const TOOLS = [
  {
    name: 'evaluate_policy',
    description: 'Evaluate a proposed discount against the active pricing policy',
  },
  {
    name: 'get_policy_summary',
    description: 'Get a human-readable summary of the active policy rules',
  },
  {
    name: 'get_max_discount',
    description: 'Calculate the maximum allowed discount for a given order',
  },
  {
    name: 'validate_discount_code',
    description: 'Validate a discount code and get a UCP-compatible error code',
  },
  {
    name: 'simulate_checkout_discount',
    description: 'Simulate a UCP checkout with discount codes and allocations applied',
  },
  {
    name: 'run_simulation',
    description: 'Run adversarial buyer personas against the policy, deterministically',
  },
  {
    name: 'analyze_simulation',
    description: 'Run a simulation and surface policy health insights from the results',
  },
  { name: 'create_checkout', description: 'Create a UCP checkout session' },
  { name: 'get_checkout', description: 'Retrieve a UCP checkout session by id' },
  { name: 'update_checkout', description: 'Update a session and re-evaluate its discounts' },
  { name: 'complete_checkout', description: 'Complete a session, producing an order reference' },
  { name: 'cancel_checkout', description: 'Cancel a UCP checkout session' },
] as const;

export function MCPShowcase(): ReactNode {
  return (
    <section className="mcp-showcase">
      <h2 className="section-title">MCP Tools</h2>
      <p className="section-subtitle">
        Twelve tools for testing policies conversationally with AI assistants.
      </p>
      <div className="mcp-tools-grid">
        {TOOLS.map((tool) => (
          <div className="mcp-tool" key={tool.name}>
            <code className="mcp-tool-name">{tool.name}</code>
            <p className="mcp-tool-description">{tool.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
