import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ cacheDir: 'node_modules/.vite-typography-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const useQaTypography = (await vite.ssrLoadModule('/src/typography/useQaTypography.js')).default;
const ProjectTypographyContext = (await vite.ssrLoadModule('/src/typography/ProjectTypographyContext.js')).default;
after(() => vite.close());

function CurrentTypography() {
  const { font, fontSize, qaOverride } = useQaTypography();
  return React.createElement('span', null, `${font.name}:${fontSize}:${qaOverride}`);
}

test('QA starts with shared typography despite old browser overrides', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => 'Inter Tight' };
  try {
    const markup = renderToStaticMarkup(React.createElement(ProjectTypographyContext.Provider,
      { value: { fontFamily: 'Asap Condensed', fontSize: 16 } }, React.createElement(CurrentTypography)));
    assert.equal(markup, '<span>Asap Condensed:16:false</span>');
  } finally { globalThis.localStorage = previous; }
});
