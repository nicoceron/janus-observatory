import { expect, test } from '@playwright/test';

test.describe('Observatory URL state', () => {
  test('restores and updates a shareable scenario/instrument selection', async ({ page }) => {
    await page.goto('/observatory?scenario=S9&instrument=deep_space_probes');

    const console = page.getByRole('region', { name: 'Choose how to look' });
    const scenario = console.getByRole('group', { name: /Pick a future/ });
    const instrument = console.getByRole('group', { name: /Pick an instrument/ });
    await expect(scenario.getByRole('button', { name: /^S9:/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(instrument.getByRole('button', { name: /Probe/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(instrument.getByRole('button', { name: /Probe/i })).toHaveAttribute(
      'data-telemetry-event',
      'instrument_select',
    );
    await expect(page.getByRole('img', { name: 'Atmospheric fingerprint for S9' })).toBeVisible();
    await expect(page.locator('[aria-labelledby~="modality-svg-title"]')).toHaveCount(1);

    const carbonDioxideRow = page.getByRole('group', {
      name: /CO2\. S9: 280 ppm\./,
    });
    await carbonDioxideRow.focus();
    await expect(carbonDioxideRow).toBeFocused();

    await page.getByText('Show exact values and sources').click();
    await expect(
      page.getByRole('table', {
        name: 'Atmosphere values for S9 and the reference Earths',
      }),
    ).toBeVisible();

    await scenario.getByRole('button', { name: /^S4:/ }).click();
    await expect(scenario.getByRole('button', { name: /^S4:/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect.poll(() => new URL(page.url()).searchParams.get('scenario')).toBe('S4');
    await expect(page.getByRole('img', { name: 'Atmospheric fingerprint for S4' })).toBeVisible();
    await expect(page.locator('[aria-labelledby~="modality-svg-title"]')).toHaveCount(1);
    await instrument.getByRole('button', { name: /Infrared/i }).click();
    await expect(instrument.getByRole('button', { name: /Infrared/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect
      .poll(() => new URL(page.url()).searchParams.get('instrument'))
      .toBe('large_interferometer_for_exoplanets');

    await page.reload();
    await expect(scenario.getByRole('button', { name: /^S4:/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(instrument.getByRole('button', { name: /Infrared/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await console.getByRole('button', { name: 'Show as a table' }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBe('data');
    await expect(
      page.getByRole('table', { name: 'What each instrument could detect in S4' }),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Hide the table' })).toBeVisible();
  });
});

test.describe('Atlas analytical controls', () => {
  test('deduplicates malformed comparison URLs before enforcing the limit', async ({ page }) => {
    await page.goto('/atlas?compare=S1,S1,S4,UNKNOWN,S9,S10');

    await expect(page.getByText('3 of 3 selected')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Comparing S1, S4, S9' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /S1/ })).toHaveCount(1);
  });

  test('restores comparison state and enforces the three-scenario limit', async ({ page }) => {
    await page.goto('/atlas?compare=S5,S9');

    await expect(page.getByText('2 of 3 selected')).toBeVisible();
    const s4 = page.getByRole('article').filter({ has: page.getByText('S4', { exact: true }) });
    const s4Toggle = s4.getByRole('button', { name: 'Compare' });
    await expect(s4Toggle).toHaveAttribute('data-telemetry-event', 'comparison_update');
    await expect(s4Toggle).toHaveAttribute('data-telemetry-value', 'S4');
    await s4Toggle.click();
    await expect(page.getByText('3 of 3 selected')).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get('compare')).toBe('S5,S9,S4');

    const s1 = page.getByRole('article').filter({ has: page.getByText('S1', { exact: true }) });
    await expect(s1.getByRole('button', { name: 'Three selected' })).toBeDisabled();

    const s9 = page.getByRole('article').filter({ has: page.getByText('S9', { exact: true }) });
    await s9.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('2 of 3 selected')).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get('compare')).toBe('S5,S4');
    await expect(s1.getByRole('button', { name: 'Compare' })).toBeEnabled();

    await page.reload();
    await expect(page.getByRole('table', { name: 'Comparing S5, S4' })).toBeVisible();
  });

  test('switches among sourced analytical dimensions without ranking scenarios', async ({
    page,
  }) => {
    await page.goto('/atlas?compare=S1,S4,S9');

    const analysis = page.getByRole('region', { name: 'One dimension at a time.' });
    const metrics = {
      Population: 'Population in 1,000 years',
      'Energy use': 'Energy used per year',
      'What telescopes see': 'What each instrument could detect',
      'Signs beyond Earth': 'Signs of technology across the Solar System',
    } as const;
    for (const [metric, output] of Object.entries(metrics)) {
      const control = analysis.getByRole('button', { name: metric, exact: true });
      await expect(control).toBeVisible();
      await control.click();
      await expect(control).toHaveAttribute('aria-pressed', 'true');
      await expect(analysis.getByRole('heading', { name: output })).toBeVisible();
    }
    await expect(analysis).toContainText(/rank/i);
    await expect(analysis).not.toContainText('Count of filled Figure 6 cells');
    await expect.poll(() => new URL(page.url()).searchParams.get('lens')).toBe('system');

    await analysis.getByText('Show as a table').click();
    const table = analysis.getByRole('table', {
      name: 'Signs of technology across the Solar System, all ten futures',
    });
    await expect(table).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(11);
    await expect(table).not.toContainText(/\d+ categories/);

    await page.reload();
    await expect(
      page
        .getByRole('region', { name: 'One dimension at a time.' })
        .getByRole('button', { name: 'Signs beyond Earth', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('keeps downloads, museum rights, and record detail evidence distinct', async ({
    page,
    request,
  }) => {
    await page.goto('/atlas?compare=S1,S4,S9');

    const museum = page.getByRole('region', { name: 'Objects from possible worlds.' });
    await expect(museum).toContainText('All rights reserved');
    await expect(museum).toContainText('CC BY 4.0');

    const json = await request.get('/atlas/data?format=json');
    expect(json.ok()).toBeTruthy();
    expect(json.headers()['content-disposition']).toContain('janus-observatory-1.0.0.json');
    expect(json.headers()['x-janus-data-version']).toMatch(/^sha256:/);
    expect((await json.json()).releaseStatus).toBe('candidate_pending_independent_review');

    const csv = await request.get('/atlas/data?format=csv');
    expect(csv.ok()).toBeTruthy();
    expect(csv.headers()['content-disposition']).toContain('janus-scenarios-1.0.0.csv');
    expect((await csv.text()).split('\n')[0]).toBe(
      'scenarioId,globalFactor,technologyCluster,technologyFactors,mythMetaphor,canonicalSummary,economy,politics,society,technosphere,biosphereCaptureStatus,biosphere,spatialDistribution,development,connectivity,smallestScale,population,annualEnergyUseJ,growthState,annualGrowthRate,sourceIds,fieldProvenanceJson',
    );

    await page.goto('/atlas/s9');
    await expect(page.getByRole('table', { name: 'Marks on each world in S9' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Objects from this world.' })).toBeVisible();
    await expect(
      page.getByText('Nothing listed for this instrument.', { exact: true }).first(),
    ).toBeVisible();
  });
});

test.describe('Methods validation disclosure', () => {
  test('bounds the independent report and serves the manifest-verified artifact', async ({
    page,
    request,
  }) => {
    await page.goto('/methods');

    await expect(page.getByRole('heading', { name: 'Collapse and recovery' })).toBeVisible();
    await expect(page.getByText(/matches 29 of the 29 results/)).toBeVisible();
    await expect(page.getByText(/For 11 more, the paper only/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'See the rebuild' })).toHaveAttribute(
      'href',
      '/research/resilience',
    );

    const report = await request.get('/api/downloads/independent-validation');
    expect(report.ok()).toBeTruthy();
    expect(report.headers()['content-disposition']).toContain(
      'janus-independent-validation-1.0.0.json',
    );
    const body = await report.json();
    expect(body.evidenceKind).toBe('reimplemented');
    expect(body.canonicalStatus).toBe('noncanonical');
    expect(
      body.scenarios
        .flatMap((scenario: { comparisons: Array<{ verdict: string }> }) => scenario.comparisons)
        .filter((comparison: { verdict: string }) => comparison.verdict === 'not_validated'),
    ).toHaveLength(11);
  });
});
