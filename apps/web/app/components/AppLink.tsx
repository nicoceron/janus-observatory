'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';

/** Avoid speculative route traffic and the Next 16/OpenNext segment-prefetch retry loop. */
export default function AppLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} prefetch={false} />;
}
