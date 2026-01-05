import type { ReactElement } from 'react';

interface OSSBadgeProps {
  license?: string;
}

export function OSSBadge({ license = 'MIT' }: OSSBadgeProps): ReactElement {
  return <span className="oss-badge">Open Source · {license} License</span>;
}
