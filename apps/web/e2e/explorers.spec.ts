import { expect, test } from '@playwright/test';

test.describe('Observatory URL state', () => {
  test('restores and updates a shareable scenario/instrument selection', async ({ page }) => {
    await page.goto('/observatory?scenario=S9&instrument=deep_space_probes');

    const console = page.getByRole('region', { name: 'Alien telescope console' });
    const scenario = console.getByRole('group', { name: /Select future/ });
    const instrument = console.getByRole('group', { name: /Select observing concept/ });
    await expect(scenario.getByRole('button', { name: /^S9:/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(instrument.getByRole('button', { name: /Probe/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await scenario.getByRole('button', { name: /^S4:/ }).click();
    await expect(scenario.getByRole('button', { name: /^S4:/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect.poll(() => new URL(page.url()).searchParams.get('scenario')).toBe('S4');
    await instrument.getByRole('button', { name: /LIFE/i }).click();
    await expect(instrument.getByRole('button', { name: /LIFE/i })).toHaveAttribute(
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
    await expect(instrument.getByRole('button', { name: /LIFE/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('Atlas analytical controls', () => {
  test('restores comparison state and enforces the three-scenario limit', async ({ page }) => {
    await page.goto('/atlas?compare=S5,S9');

    await expect(page.getByText('2 of 3 selected')).toBeVisible();
    const s4 = page.getByRole('article').filter({ has: page.getByText('S4', { exact: true }) });
    await s4.getByRole('button', { name: 'Compare' }).click();
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
    await expect(
      page.getByRole('table', { name: 'Canonical comparison for S5, S4' }),
    ).toBeVisible();
  });

  test('switches among sourced analytical dimensions without ranking scenarios', async ({
    page,
  }) => {
    await page.goto('/atlas?compare=S1,S4,S9');

    const analysis = page.getByRole('region', { name: 'Compare the possibility space' });
    const metrics = {
      Population: 'Population after 1,000 years',
      'Annual energy': 'Annual energy use',
      Detectability: 'Mission concepts with a listed signature',
      'System reach': 'Listed system technosignature categories',
    } as const;
    for (const [metric, output] of Object.entries(metrics)) {
      const control = analysis.getByRole('button', { name: metric, exact: true });
      await expect(control).toBeVisible();
      await control.click();
      await expect(control).toHaveAttribute('aria-pressed', 'true');
      await expect(analysis.getByRole('heading', { name: output })).toBeVisible();
    }
    await expect(analysis).toContainText(/rank/i);

    await analysis.getByText('Open structured metric table').click();
    const table = analysis.getByRole('table', {
      name: 'Listed system technosignature categories for all scenarios',
    });
    await expect(table).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(11);
  });
});
