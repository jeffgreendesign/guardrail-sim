import type { ReactNode } from 'react';

interface OSSBadgeProps {
  license?: string;
}

export function OSSBadge({ license = 'MIT' }: OSSBadgeProps): ReactNode {
  return <span className="oss-badge">Open Source · {license} License</span>;
}
