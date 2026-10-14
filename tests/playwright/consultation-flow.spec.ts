import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
const ACCESS_KEY = '42260812345678000123550010000012341000012342';
const xmlUrl = new URL('../../apps/web/tests/fixtures/nfe-basic.xml', import.meta.url);
const xml = await readFile(xmlUrl, 'utf8');
const xmlPath = fileURLToPath(xmlUrl);

test('consulta unitária usa somente o Portal Nacional', async ({ page }) => {
  await page.addInitScript(({ xmlPayload }) => {
    const channel = 'nfe-agendamento:portal-extension';
    let operationId = '';
    window.addEventListener('message', (event) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const envelope = event.data as any;
      if (!envelope || envelope.channel !== channel || envelope.direction !== 'request') return;
      const command = envelope.command;
      const respond = (response: unknown) => window.postMessage(
        { channel, direction: 'response', requestId: envelope.requestId, response },
        window.location.origin,
      );
      if (command?.type === 'ping') {
        respond({
          type: 'ready',
          requestId: command.requestId,
          version: '0.2.11',
          capabilities: { openOptions: true, portalLookup: true, supplierResolution: true },
        });
        return;
      }
      if (command?.type === 'start') {
        operationId = 'e2e-op';
        respond({ type: 'started', requestId: command.requestId, operationId });
        window.setTimeout(() => window.postMessage(
          { channel, direction: 'event', event: { type: 'completed', operationId, xml: xmlPayload } },
          window.location.origin,
        ), 300);
        return;
      }
      if (command?.type === 'status') {
        respond({
          type: 'operation_status',
          requestId: command.requestId,
          operationId,
          active: true,
          state: 'waiting_user',
        });
        return;
      }
      if (command?.type === 'resolve_supplier') {
        respond({ type: 'supplier_resolved', requestId: command.requestId, supplierId: null });
        return;
      }
      if (command?.type === 'cancel') {
        respond({ type: 'cancelled', requestId: command.requestId, operationId });
      }
    });
  }, { xmlPayload: xml });

  await page.goto('/');
  await expect(page.locator('#batch-run-toolbar')).toBeHidden();
  await expect(page.locator('#batch-list')).toBeHidden();
  await expect(page.locator('#batch-reset')).toBeVisible();
  await expect(page.locator('.batch-actions')).toHaveCSS('display', 'grid');
  await expect(page.locator('.batch-actions .action-icon')).toHaveCount(2);
  await expect(page.locator('#integration-status-text')).toContainText('Extensão conectada');
  const input = page.locator('#batch-keys');
  const consult = page.locator('#batch-start');
  const cancel = page.locator('#batch-cancel');
  await input.fill(ACCESS_KEY);
  await expect(page.locator('#batch-key-count')).toHaveText('Qtd. caracteres: 44');
  await expect(page.locator('#batch-list')).toBeHidden();
  await expect(consult).toBeEnabled();
  await consult.click();
  await expect(page.locator('#batch-run-toolbar')).toBeVisible();
  await expect(page.locator('#batch-list')).toBeVisible();
  await expect(page.locator('#batch-route')).toContainText('Portal');
  await expect(cancel).toBeVisible();
  const row = page.locator('.batch-item[data-state="success"]');
  await expect(row).toBeVisible();
  await expect(cancel).toBeHidden();
  await expect(row.getByRole('button', { name: 'Visualizar DANFE' })).toBeEnabled();
  await expect(row.getByRole('button', { name: 'Baixar XML' })).toBeEnabled();
  await expect(row.getByRole('button', { name: 'Imprimir', exact: true })).toBeEnabled();
  await expect(row.locator('.batch-item-actions')).toHaveCSS('display', 'grid');
  await expect(row.locator('.batch-action:not([hidden]) .action-icon')).toHaveCount(3);
  await expect(page.locator('#batch-list')).toHaveAttribute('data-count', '1');
  const desktopRow = await row.boundingBox();
  expect(desktopRow).not.toBeNull();
  expect(desktopRow!.height).toBeLessThan(90);
  const desktopActions = await row.locator('.batch-item-actions').boundingBox();
  expect(desktopActions).not.toBeNull();
  expect(desktopActions!.y + desktopActions!.height).toBeLessThanOrEqual(desktopRow!.y + desktopRow!.height + 1);

  await page.setViewportSize({ width: 390, height: 780 });
  await expect(row.getByRole('button', { name: 'Visualizar DANFE' })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Baixar XML' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('#batch-zip')).toBeHidden();
  const reset = page.locator('#batch-reset');
  await expect(reset).toBeVisible();
  await reset.click();
  await expect(input).toHaveValue('');
  await expect(page.locator('#batch-key-count')).toHaveText('Qtd. caracteres: 0');
  await expect(page.locator('#batch-run-toolbar')).toBeHidden();
  await expect(page.locator('#batch-list')).toBeHidden();
});


test('erro do Portal permite recuperar a mesma NF-e por XML local', async ({ page }) => {
  await page.addInitScript(() => {
    const channel = 'nfe-agendamento:portal-extension';
    let operationId = '';

    window.addEventListener('message', (event) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const envelope = event.data as any;
      if (!envelope || envelope.channel !== channel || envelope.direction !== 'request') return;

      const command = envelope.command;
      const respond = (response: unknown) => window.postMessage(
        { channel, direction: 'response', requestId: envelope.requestId, response },
        window.location.origin,
      );

      if (command?.type === 'ping') {
        respond({
          type: 'ready',
          requestId: command.requestId,
          version: '0.2.13',
          capabilities: { openOptions: true, portalLookup: true, supplierResolution: true },
        });
        return;
      }

      if (command?.type === 'start') {
        operationId = 'e2e-recovery-op';
        respond({ type: 'started', requestId: command.requestId, operationId });
        window.setTimeout(() => window.postMessage(
          {
            channel,
            direction: 'event',
            event: {
              type: 'failed',
              operationId,
              code: 'portal_download_not_found',
              message: 'Falha controlada do Portal.',
            },
          },
          window.location.origin,
        ), 100);
        return;
      }

      if (command?.type === 'status') {
        respond({
          type: 'operation_status',
          requestId: command.requestId,
          operationId,
          active: true,
          state: 'waiting_user',
        });
        return;
      }

      if (command?.type === 'resolve_supplier') {
        respond({ type: 'supplier_resolved', requestId: command.requestId, supplierId: null });
        return;
      }

      if (command?.type === 'cancel') {
        respond({ type: 'cancelled', requestId: command.requestId, operationId });
      }
    });
  });

  await page.goto('/');
  const input = page.locator('#batch-keys');
  await input.fill(ACCESS_KEY);
  await page.locator('#batch-start').click();

  const failedRow = page.locator('.batch-item[data-state="portal_error"]');
  await expect(failedRow).toBeVisible();
  await expect(failedRow.locator('.batch-details')).toContainText('Código: portal_download_not_found');
  await page.locator('#settings-trigger').click();
  await expect(page.locator('#settings-panel')).toContainText('Atualização recomendada');
  await expect(page.locator('#settings-panel')).toContainText('Pronta');
  await page.locator('#settings-close').click();

  await page.setViewportSize({ width: 390, height: 780 });
  await expect(failedRow.getByRole('button', { name: 'Importar XML' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(failedRow.getByRole('button', { name: 'Importar XML' })).toBeVisible();
  await expect(failedRow.locator('.batch-action:not([hidden]) .action-icon')).toHaveCount(2);

  const chooserPromise = page.waitForEvent('filechooser');
  await failedRow.getByRole('button', { name: 'Importar XML' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(xmlPath);

  const recoveredRow = page.locator('.batch-item[data-state="success"]');
  await expect(recoveredRow).toBeVisible();
  await expect(recoveredRow.locator('.batch-source')).toHaveText('XML manual');
  await expect(recoveredRow.getByRole('button', { name: 'Visualizar DANFE' })).toBeEnabled();
  await expect(recoveredRow.getByRole('button', { name: 'Baixar XML' })).toBeEnabled();
});
