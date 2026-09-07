import { expect, test, type Locator } from '@playwright/test';

const storyName = 'Watch one Earth become ten possible worlds.';
const storySessionKey = 'janus-guided-story-v3';
const legacyStorySessionKey = 'janus-guided-story-v2';
const earthRuntimeTexturePattern =
  /\/assets\/planets\/earth-(?:day|night|bump-roughness-clouds)-(?:1024|2048|4096)\.(?:webp|jpg)$/;
const observerModelPath = '/assets/models/janus-observatory-v2.glb';
const scenarioPortraitPattern = /\/assets\/scenarios\/s(?:10|[1-9])-world-v1\.webp$/;

async function openOptionalSpatialView(story: Locator) {
  const stage = story.locator('.earthStage');
  await expect(stage).toHaveAttribute('data-spatial-consent', /^(granted|required)$/);
  const posterFirst = (await stage.getAttribute('data-spatial-consent')) === 'required';
  if (posterFirst) {
    await expect(stage).toHaveAttribute('data-render-state', 'poster');
    await expect(stage).toHaveAttribute('data-world-lifecycle', 'poster-first');
    await expect(stage.locator('canvas')).toHaveCount(0);
    await story.getByRole('button', { name: 'Open interactive view' }).click();
    await expect(stage).toHaveAttribute('data-spatial-consent', 'granted');
  }
  return posterFirst;
}

test.describe('guided story', () => {
  test('starts as a scroll story and offers Read and Skip paths', async ({ page }) => {
    test.setTimeout(70_000);
    const splineRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).hostname.endsWith('spline.design')) {
        splineRequests.push(request.url());
      }
    });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Ten futures. One system.' })).toBeVisible();
    await expect(page.locator('.heroSpline')).toHaveCount(1);
    await expect(page.locator('.heroSpline')).toHaveAttribute(
      'data-motion-source',
      'native-svg-gsap',
    );
    await expect(page.locator('.heroImageField iframe')).toHaveCount(0);
    expect(splineRequests).toEqual([]);

    const story = page.getByRole('region', { name: storyName });
    await expect(story.getByRole('button', { name: 'Start story', exact: true })).toBeVisible();
    await expect(story.getByRole('button', { name: 'Read without animation' })).toBeVisible();
    await expect(story.getByRole('link', { name: 'Skip to Atlas' })).toHaveAttribute(
      'href',
      '/atlas',
    );
    await expect(story.getByText('Article and 2D scene ready')).toBeVisible();
    await expect(story.getByLabel('Story chapters').getByRole('article')).toHaveCount(31);
    await expect(story.locator('.storySticky')).toBeVisible();

    const steps = story.getByLabel('Story chapters').getByRole('article');
    await steps.nth(1).scrollIntoViewIfNeeded();
    await expect(page.locator('.heroSpline')).toHaveCount(0);
    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(story.locator('.storyStage')).toHaveAttribute(
      'data-active-step',
      'possibility-families',
    );
    await expect(steps.nth(1)).toHaveAttribute('data-telemetry-chapter', 'possibility-families');
    await expect(story.locator('.earthStage')).toHaveAttribute('data-scene-kind', 'branches', {
      timeout: 40_000,
    });
    await expect(story.locator('.earthStage')).toHaveAttribute(
      'data-branch-layout',
      'spatial-families',
    );
    await expect(story.locator('.earthStage')).toHaveAttribute(
      'data-branch-animation',
      'scroll-scrubbed',
    );
    await expect
      .poll(async () =>
        Number(await story.locator('.earthStage').getAttribute('data-branch-progress')),
      )
      .toBeGreaterThan(0);

    await story.getByRole('button', { name: 'Read without animation' }).click();
    await expect(story.locator('.storySticky')).toBeHidden();
    await expect(story.getByRole('button', { name: 'Return to visual story' })).toBeVisible();
    await expect(story.getByRole('heading', { name: 'One world. Your pace.' })).toBeVisible();
  });

  test('supports a complete keyboard path and restart', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');

    const story = page.getByRole('region', { name: storyName });
    const steps = story.getByLabel('Story chapters').getByRole('article');
    await steps.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(steps.nth(1)).toBeFocused();
    await expect(story.locator('.storyStage')).toHaveAttribute(
      'data-active-step',
      'possibility-families',
    );
    await expect(story).toHaveAttribute('data-transition-direction', 'forward');
    await expect(story).toHaveAttribute('data-transition-kind', 'step');
    await expect(story.locator('.storyStage')).toHaveAttribute(
      'data-scene-handoff',
      'present-to-branches',
    );
    await expect(steps.nth(0)).toHaveAttribute('data-step-position', 'past');
    await expect(steps.nth(1)).toHaveAttribute('data-step-position', 'active');

    await page.keyboard.press('ArrowUp');
    await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step');
    await expect(steps.nth(0)).toBeFocused();
    await expect(story).toHaveAttribute('data-transition-direction', 'backward');
    await expect(story).toHaveAttribute('data-transition-kind', 'step');

    await page.keyboard.press('ArrowDown');
    await story.getByLabel('Choose story chapter').click();
    await story
      .getByRole('navigation', { name: 'Story progress' })
      .getByRole('button', { name: /06.*Cycles/ })
      .click();
    await expect(story.locator('.storyStage')).toHaveAttribute(
      'data-active-step',
      'civilizations-breathe',
    );
    await expect(story).toHaveAttribute('data-transition-direction', 'forward');
    await expect(story).toHaveAttribute('data-transition-kind', 'jump');

    const restart = story.getByRole('button', { name: 'Restart story' });
    await restart.evaluate((button) => button.focus({ preventScroll: true }));
    await expect(restart).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step');
    await expect(story.locator('.storyStage')).toHaveAttribute('data-active-step', 'one-earth');
  });

  test('resumes the last in-session step and observer selection', async ({ page }) => {
    await page.goto('/');

    let story = page.getByRole('region', { name: storyName });
    const steps = story.getByLabel('Story chapters').getByRole('article');
    await steps.nth(13).scrollIntoViewIfNeeded();
    await expect(story.locator('.storyStage')).toHaveAttribute('data-active-step', 'observer-turn');
    const hwo = story.locator('[role="radio"][data-instrument="habitable_worlds_observatory"]');
    const radio = story.locator('[role="radio"][data-instrument="radio"]');
    await hwo.focus();
    await page.keyboard.press('ArrowRight');
    await expect(radio).toHaveAttribute('aria-checked', 'true');
    await expect
      .poll(() =>
        page.evaluate((key) => {
          const stored = window.sessionStorage.getItem(key);
          return stored ? (JSON.parse(stored) as unknown) : null;
        }, storySessionKey),
      )
      .toEqual({ activeIndex: 13, mode: 'guided', selectedObserver: 'radio', version: 3 });

    await page.reload();
    story = page.getByRole('region', { name: storyName });
    await story.getByRole('button', { name: 'Resume at 14 / 31' }).click();
    await expect(story.locator('.storyStage')).toHaveAttribute('data-active-step', 'observer-turn');
    await expect(story.locator('[role="radio"][data-instrument="radio"]')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const resumedSteps = story.getByLabel('Story chapters').getByRole('article');
    await expect(resumedSteps.nth(14)).toHaveAttribute(
      'data-telemetry-chapter',
      'observe-s1-radio',
    );
    await expect(resumedSteps.nth(14)).toContainText('You chose Radio array');
    await expect(story.locator('.handoffPanel a').first()).toHaveAttribute(
      'href',
      '/observatory?scenario=S9&instrument=radio',
    );
  });

  test('migrates a legacy v2 session with the safe default observer', async ({ page }) => {
    await page.goto('/');

    let story = page.getByRole('region', { name: storyName });
    await page.evaluate(
      ([currentKey, legacyKey]) => {
        window.sessionStorage.removeItem(currentKey);
        window.sessionStorage.setItem(
          legacyKey,
          JSON.stringify({ activeIndex: 13, mode: 'guided' }),
        );
      },
      [storySessionKey, legacyStorySessionKey],
    );

    await page.reload();
    story = page.getByRole('region', { name: storyName });
    await expect
      .poll(() =>
        page.evaluate(
          ([currentKey, legacyKey]) => ({
            current: JSON.parse(window.sessionStorage.getItem(currentKey) ?? 'null') as unknown,
            legacy: window.sessionStorage.getItem(legacyKey),
          }),
          [storySessionKey, legacyStorySessionKey],
        ),
      )
      .toEqual({
        current: {
          activeIndex: 13,
          mode: 'guided',
          selectedObserver: 'habitable_worlds_observatory',
          version: 3,
        },
        legacy: null,
      });

    await story.getByRole('button', { name: 'Resume at 14 / 31' }).click();
    await expect(
      story.locator('[role="radio"][data-instrument="habitable_worlds_observatory"]'),
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('keeps one 3D world mounted from Earth through the system handoff', async ({ page }) => {
    test.setTimeout(60_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const response = await page.goto('/');
    expect(response?.headers()['content-security-policy']).toContain("connect-src 'self' blob:");
    await page.locator('html').evaluate((element) => {
      element.style.scrollBehavior = 'auto';
    });

    const story = page.getByRole('region', { name: storyName });
    const stage = story.locator('.earthStage');
    const canvas = stage.locator('canvas');
    const steps = story.getByLabel('Story chapters').getByRole('article');

    await story.getByRole('button', { name: 'Start story', exact: true }).click();
    const posterFirst = await openOptionalSpatialView(story);
    expect(posterFirst).toBe(false); // Start itself grants spatial intent on every tier.
    await expect(stage).toHaveAttribute('data-world-lifecycle', 'persistent', { timeout: 20_000 });
    await expect(stage).toHaveAttribute('data-render-loop', 'demand');
    await expect(canvas).toHaveCount(1, { timeout: 20_000 });
    await expect(story.locator('.storyReadiness')).toContainText(
      /Complete 2D fallback ready|Spatial stage ready/,
      { timeout: 20_000 },
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    await page.evaluate(
      (element) => {
        (window as Window & { __janusStoryCanvas?: Element }).__janusStoryCanvas = element;
      },
      await canvas.elementHandle(),
    );

    for (const [index, kind] of [
      [1, 'branches'],
      [3, 'scenario'],
      [13, 'observer'],
      [14, 'ocular'],
      [26, 'matrix'],
      [27, 'collapse'],
      [29, 'handoff'],
      [30, 'epilogue'],
    ] as const) {
      await steps.nth(index).scrollIntoViewIfNeeded();
      await expect(stage).toHaveAttribute('data-scene-kind', kind);
      if (kind === 'scenario') {
        await expect(story.locator('.storyMetricReadout dt')).toHaveText([
          'Population',
          'Annual energy',
          'Governance',
          'Technology',
        ]);
        await expect(story.getByText('Listed methods', { exact: true })).toHaveCount(0);
      }
      if (kind === 'observer') {
        await expect(steps.nth(index)).toHaveAttribute('data-scroll-anchor', 'observer');
        await expect(stage).toHaveAttribute('data-observer-asset', 'janus-observatory-v2');
        await expect(stage).toHaveAttribute('data-observer-motion', 'skeletal-authored-scroll');
        await expect(stage).toHaveAttribute(
          'data-observer-camera',
          'blender-authored-optical-axis',
        );
        await expect(stage.locator('.earthCanvas')).toHaveCSS('opacity', '1');
        await expect(stage.locator('.observerPoster')).toHaveCount(0);
        const hwo = story.locator('[role="radio"][data-instrument="habitable_worlds_observatory"]');
        const radio = story.locator('[role="radio"][data-instrument="radio"]');
        await hwo.focus();
        await page.keyboard.press('ArrowRight');
        await expect(radio).toHaveAttribute('aria-checked', 'true');
        await page.keyboard.press('Escape');
        await expect(hwo).toHaveAttribute('aria-checked', 'true');
      }
      if (kind === 'ocular') {
        await expect(
          story.getByRole('region', {
            name: 'Ocular observation of S1',
          }),
        ).toHaveClass(/storyOverlayVisible/);
        await expect(story.getByText('Alien ocular · target S1')).toBeVisible();
        await expect(story.locator('.ocularWorldFrame')).toHaveCount(0);
        await expect(story.locator('.ocularObservation')).toHaveCSS(
          'background-color',
          'rgba(0, 0, 0, 0)',
        );
        await expect(stage.locator('canvas')).toHaveCount(1);
        await expect(story.locator('.observationBridge')).toHaveCount(0);
      }
      if (kind === 'matrix') {
        await expect(
          story.getByRole('region', {
            name: 'Structured observability matrix for all ten scenarios',
          }),
        ).toHaveClass(/storyOverlayVisible/);
        await expect(
          story.getByRole('table', { name: 'Figure 6 observability matrix transcription' }),
        ).toBeVisible();
      }
      if (kind === 'collapse') {
        await expect(
          story.getByRole('region', { name: 'Reported collapse and recovery evidence' }),
        ).toHaveClass(/storyOverlayVisible/);
      }
      if (kind === 'handoff') {
        await expect(
          story.getByRole('region', { name: 'Continue to the Observatory or Atlas' }),
        ).toHaveClass(/storyOverlayVisible/);
      }
      if (kind === 'epilogue') {
        await expect(
          story.getByRole('region', { name: 'Absence of evidence epilogue' }),
        ).toHaveClass(/storyOverlayVisible/);
      }
      const sameCanvas = await page.evaluate(
        (element) =>
          (window as Window & { __janusStoryCanvas?: Element }).__janusStoryCanvas === element,
        await canvas.elementHandle(),
      );
      expect(sameCanvas).toBe(true);
    }
    expect(pageErrors).toEqual([]);
  });

  test('loads only the bounded Earth texture tier selected for the device', async ({
    page,
  }, testInfo) => {
    test.skip(
      !['chromium', 'mobile-chromium'].includes(testInfo.project.name),
      'Tier delivery is pinned to the Chromium desktop and mobile capability fixtures.',
    );
    test.setTimeout(60_000);
    const requestedEarthTextures: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (earthRuntimeTexturePattern.test(path)) requestedEarthTextures.push(path);
    });
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'deviceMemory', {
        configurable: true,
        get: () => 8,
      });
      Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
        configurable: true,
        get: () => 8,
      });
    });

    await page.goto('/');

    const story = page.getByRole('region', { name: storyName });
    await story.getByRole('button', { name: 'Start story', exact: true }).click();
    const stage = story.locator('.earthStage');
    const mobile = testInfo.project.name === 'mobile-chromium';
    const expected = mobile
      ? { device: 'low', texture: '1k', suffix: '-1024.webp', dpr: '1', anisotropy: '2' }
      : {
          device: 'medium',
          texture: '2k',
          suffix: '-2048.webp',
          dpr: '1.25',
          anisotropy: '4',
        };

    await expect(stage).toHaveAttribute('data-earth-device-tier', expected.device);
    await expect(stage).toHaveAttribute('data-earth-texture-tier', expected.texture);
    await expect(stage).toHaveAttribute('data-earth-dpr-cap', expected.dpr);
    await expect(stage).toHaveAttribute('data-earth-anisotropy-cap', expected.anisotropy);
    await expect(stage.locator('[data-earth-render-status="bounded"] dd').nth(1)).toHaveText(
      expected.texture,
    );
    const posterFirst = await openOptionalSpatialView(story);
    expect(posterFirst).toBe(false);
    await expect(stage).toHaveAttribute('data-render-state', 'ready', { timeout: 30_000 });
    await expect.poll(() => new Set(requestedEarthTextures).size).toBe(3);
    expect(requestedEarthTextures.every((path) => path.endsWith(expected.suffix))).toBe(true);
    expect(requestedEarthTextures.some((path) => path.includes('-4096.'))).toBe(false);
  });

  test('requests spatial and portrait assets only after their explicit story intent', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'The request-order trace is pinned to desktop Chromium.',
    );
    test.setTimeout(70_000);
    const requestedEarthTextures: string[] = [];
    const requestedObserverModels: string[] = [];
    const requestedScenarioPortraits: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (earthRuntimeTexturePattern.test(path)) requestedEarthTextures.push(path);
      if (path === observerModelPath) requestedObserverModels.push(path);
      if (scenarioPortraitPattern.test(path)) requestedScenarioPortraits.push(path);
    });

    await page.goto('/');
    const story = page.getByRole('region', { name: storyName });
    await page.waitForLoadState('networkidle');
    expect(requestedEarthTextures).toEqual([]);
    expect(requestedObserverModels).toEqual([]);
    expect(requestedScenarioPortraits).toEqual([]);

    await story.getByRole('button', { name: 'Start story', exact: true }).click();
    const stage = story.locator('.earthStage');
    await expect(stage).toHaveAttribute('data-render-state', 'ready', { timeout: 30_000 });
    await expect.poll(() => new Set(requestedEarthTextures).size).toBe(3);
    expect(requestedObserverModels).toEqual([]);
    expect(requestedScenarioPortraits).toEqual([]);

    const steps = story.getByLabel('Story chapters').getByRole('article');
    await steps.nth(12).scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-scene-kind', 'scenario');
    // S10 is adjacent to the observer; stage its small asset before the chapter boundary.
    await expect.poll(() => new Set(requestedObserverModels).size).toBe(1);
    expect(requestedScenarioPortraits).toEqual([]);

    await steps.nth(13).scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-scene-kind', 'observer');
    await expect.poll(() => new Set(requestedObserverModels).size).toBe(1);
    expect(requestedScenarioPortraits).toEqual([]);

    await steps.nth(14).scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-scene-kind', 'ocular');
    expect(requestedScenarioPortraits).toEqual([]);
  });

  test('reserves 4K Earth textures for an explicitly high-capacity display', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'The high-tier capability fixture is deterministic in desktop Chromium.',
    );
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1800, height: 1000 });
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'deviceMemory', {
        configurable: true,
        get: () => 8,
      });
      Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
        configurable: true,
        get: () => 12,
      });
    });
    const requestedEarthTextures: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (earthRuntimeTexturePattern.test(path)) requestedEarthTextures.push(path);
    });

    await page.goto('/');

    const story = page.getByRole('region', { name: storyName });
    await story.getByRole('button', { name: 'Start story', exact: true }).click();
    const stage = story.locator('.earthStage');
    await expect(stage).toHaveAttribute('data-earth-device-tier', 'high');
    await expect(stage).toHaveAttribute('data-earth-texture-tier', '4k');
    await expect(stage).toHaveAttribute('data-earth-dpr-cap', '1.5');
    await expect(stage).toHaveAttribute('data-earth-anisotropy-cap', '8');
    await expect(stage).toHaveAttribute('data-render-state', 'ready', { timeout: 30_000 });
    await expect.poll(() => new Set(requestedEarthTextures).size).toBe(3);
    expect(requestedEarthTextures.every((path) => path.endsWith('-4096.jpg'))).toBe(true);
  });

  test('keeps passive low-tier reduced-motion scrolling poster-first until explicit opt-in', async ({
    page,
  }, testInfo) => {
    test.skip(
      !['chromium', 'mobile-chromium'].includes(testInfo.project.name),
      'Desktop low-memory and mobile coarse-pointer fixtures are deterministic in Chromium.',
    );
    test.setTimeout(70_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (testInfo.project.name === 'chromium') {
      await page.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, 'deviceMemory', {
          configurable: true,
          get: () => 2,
        });
      });
    }
    const requestedEarthTextures: string[] = [];
    const requestedObserverModels: string[] = [];
    const requestedScenarioPortraits: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (earthRuntimeTexturePattern.test(path)) requestedEarthTextures.push(path);
      if (path === observerModelPath) requestedObserverModels.push(path);
      if (scenarioPortraitPattern.test(path)) requestedScenarioPortraits.push(path);
    });

    await page.goto('/');

    const story = page.getByRole('region', { name: storyName });
    await story.locator('#story-step-2').scrollIntoViewIfNeeded();
    const stage = story.locator('.earthStage');
    await expect(stage).toHaveAttribute('data-earth-device-tier', 'low');
    await expect(stage).toHaveAttribute('data-observer-motion', 'reduced');
    await expect(stage).toHaveAttribute('data-spatial-consent', 'required');
    await expect(stage).toHaveAttribute('data-render-state', 'poster');
    await expect(stage).toHaveAttribute('data-world-lifecycle', 'poster-first');
    await expect(stage.locator('canvas')).toHaveCount(0);
    expect(requestedEarthTextures).toEqual([]);
    expect(requestedObserverModels).toEqual([]);
    expect(requestedScenarioPortraits).toEqual([]);
    await story.getByRole('link', { name: /Project Janus · scenario framing/ }).click({
      trial: true,
    });

    const steps = story.getByLabel('Story chapters').getByRole('article');
    await steps.nth(13).scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-scene-kind', 'observer');
    await expect(stage.locator('canvas')).toHaveCount(0);
    expect(requestedEarthTextures).toEqual([]);
    expect(requestedObserverModels).toEqual([]);
    expect(requestedScenarioPortraits).toEqual([]);
    await expect(stage.locator('.observerPoster img')).toHaveAttribute(
      'src',
      '/assets/observer/janus-cinematic-observer-v2.webp',
    );

    await story.getByRole('button', { name: 'Open interactive view' }).click();
    await expect(stage).toHaveAttribute('data-spatial-consent', 'granted');
    await expect(stage).toHaveAttribute('data-world-lifecycle', 'persistent');
    await expect(stage).toHaveAttribute('data-render-state', 'ready', { timeout: 30_000 });
    await expect(stage.locator('canvas')).toHaveCount(1);
    await expect.poll(() => new Set(requestedEarthTextures).size).toBe(3);
    await expect.poll(() => new Set(requestedObserverModels).size).toBe(1);
    expect(requestedScenarioPortraits).toEqual([]);
    await expect(stage).toHaveAttribute('data-observer-motion', 'reduced');
  });

  test('falls back on graphics context loss and rebuilds only after Retry', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');

    const story = page.getByRole('region', { name: storyName });
    const stage = story.locator('.earthStage');
    await story.getByRole('button', { name: 'Start story', exact: true }).click();
    await openOptionalSpatialView(story);
    await expect(stage).toHaveAttribute('data-render-state', 'ready', { timeout: 30_000 });

    const originalCanvas = stage.locator('canvas');
    await originalCanvas.evaluate((canvas) => {
      (
        window as Window & { __janusOriginalContextCanvas?: HTMLCanvasElement }
      ).__janusOriginalContextCanvas = canvas as HTMLCanvasElement;
    });
    const contextLossMode = await originalCanvas.evaluate((canvas) => {
      const controlledCanvas = canvas as HTMLCanvasElement & {
        __janusContextControl?: WEBGL_lose_context;
      };
      const contextControl = controlledCanvas
        .getContext('webgl2')
        ?.getExtension('WEBGL_lose_context');
      if (contextControl) {
        controlledCanvas.__janusContextControl = contextControl;
        contextControl.loseContext();
        return 'extension';
      }

      const lossEvent = new WebGLContextEvent('webglcontextlost', { cancelable: true });
      return controlledCanvas.dispatchEvent(lossEvent) ? 'unhandled-event' : 'handled-event';
    });
    expect(['extension', 'handled-event']).toContain(contextLossMode);

    await expect(stage).toHaveAttribute('data-render-state', 'lost');
    await expect(story.locator('.stageFallback')).toBeVisible();
    await expect(story.getByRole('button', { name: 'Retry spatial view' })).toBeVisible();

    await originalCanvas.evaluate((canvas) => {
      const controlledCanvas = canvas as HTMLCanvasElement & {
        __janusContextControl?: WEBGL_lose_context;
      };
      if (controlledCanvas.__janusContextControl) {
        controlledCanvas.__janusContextControl.restoreContext();
        return;
      }
      controlledCanvas.dispatchEvent(new WebGLContextEvent('webglcontextrestored'));
    });
    await expect(stage).toHaveAttribute('data-render-state', 'restored');
    expect(
      await originalCanvas.evaluate(
        (canvas) =>
          (window as Window & { __janusOriginalContextCanvas?: HTMLCanvasElement })
            .__janusOriginalContextCanvas === canvas,
      ),
    ).toBe(true);

    await story.getByRole('button', { name: 'Retry spatial view' }).click();
    await expect(stage).toHaveAttribute('data-render-state', 'ready', { timeout: 30_000 });
    await expect(stage.locator('canvas')).toHaveCount(1);
    await expect
      .poll(() =>
        stage
          .locator('canvas')
          .evaluate(
            (canvas) =>
              (window as Window & { __janusOriginalContextCanvas?: HTMLCanvasElement })
                .__janusOriginalContextCanvas !== canvas,
          ),
      )
      .toBe(true);
  });

  test('honors reduced motion without losing story content', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.locator('.heroSpline')).toHaveCount(0);
    const story = page.getByRole('region', { name: storyName });
    await expect(story.locator('.earthStage')).toHaveAttribute('data-observer-motion', 'reduced');
    await expect(story).toHaveAttribute('data-motion-phase', 'settled');
    await expect(story).toHaveAttribute('data-scroll-direction', 'idle');
    await expect(story.getByText('Motion reduced')).toBeVisible();
    await expect(story.getByLabel('Story chapters').getByRole('article')).toHaveCount(31);
    await expect(story.getByText(/Current visual state:/)).toContainText('One world. Your pace.');
  });

  test('lets explicit motion controls override the operating-system preference', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const story = page.getByRole('region', { name: storyName });
    const motionControl = page.getByLabel('Motion preference');
    await expect(story.locator('.earthStage')).toHaveAttribute('data-observer-motion', 'reduced');

    await motionControl.getByRole('button', { name: 'Full', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
    await expect(story.locator('.earthStage')).not.toHaveAttribute(
      'data-observer-motion',
      'reduced',
    );
    await expect(page.locator('.heroSpline')).toHaveCount(1, { timeout: 20_000 });

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await motionControl.getByRole('button', { name: 'Reduced', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(story.locator('.earthStage')).toHaveAttribute('data-observer-motion', 'reduced');
    await expect(page.locator('.heroSpline')).toHaveCount(0);
  });

  test('keeps the spatial story usable when WebGL is unavailable', async ({ page }) => {
    const pageErrors: string[] = [];
    const requestedEarthTextures: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (earthRuntimeTexturePattern.test(path)) requestedEarthTextures.push(path);
    });
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function getContext(
        this: HTMLCanvasElement,
        contextId: string,
        options?: unknown,
      ) {
        if (contextId.startsWith('webgl')) return null;
        return originalGetContext.call(this, contextId, options as never);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto('/');

    await expect(page.locator('.heroSpline')).toHaveCount(1);
    await expect(page.locator('.heroSpline')).toHaveAttribute(
      'data-motion-source',
      'native-svg-gsap',
    );
    const story = page.getByRole('region', { name: storyName });
    const steps = story.getByLabel('Story chapters').getByRole('article');
    await steps.nth(0).focus();
    await page.keyboard.press('ArrowDown');

    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
    const stage = story.locator('.earthStage');
    await openOptionalSpatialView(story);
    await expect(stage).toHaveAttribute('data-render-state', 'failed');
    await expect(stage.locator('canvas')).toHaveCount(0);
    await expect(story.locator('.stageFallback')).toBeVisible();
    await expect(story.locator('.fallbackFutureWorld')).toHaveCount(10);
    await expect(story.locator('.fallbackFutureWorld').first()).toBeVisible();
    expect(requestedEarthTextures).toEqual([]);
    expect(pageErrors.filter((message) => message.includes('getSupportedExtensions'))).toEqual([]);
  });
});
