'use client';

import ReactDOM from 'react-dom';

/** Ask the browser to start fetching a same-origin resource while the page is still parsing. */
export function Preload({ href }: { href: string }) {
  ReactDOM.preload(href, { as: 'fetch', crossOrigin: 'anonymous' });
  return null;
}
