import { describe, expect, it } from 'vitest';
import {
  PORTAL_POPUP_WIDTH,
  PORTAL_POPUP_HEIGHT,
  RESULT_TIMEOUT_MS,
  DOWNLOAD_TIMEOUT_MS,
  READY_ATTEMPTS,
  READY_RETRY_DELAY_MS,
  MESSAGE_ATTEMPTS,
  MESSAGE_RETRY_DELAY_MS,
  MAX_XML_BYTES,
} from '../src/shared/constants.js';

describe('extension shared constants', () => {
  it('define dimensões do popup do Portal', () => {
    expect(PORTAL_POPUP_WIDTH).toBe(1100);
    expect(PORTAL_POPUP_HEIGHT).toBe(800);
  });

  it('define timeouts', () => {
    expect(RESULT_TIMEOUT_MS).toBe(90000);
    expect(DOWNLOAD_TIMEOUT_MS).toBe(30000);
    expect(RESULT_TIMEOUT_MS).toBeGreaterThan(DOWNLOAD_TIMEOUT_MS);
  });

  it('define tentativas e delays', () => {
    expect(READY_ATTEMPTS).toBe(4);
    expect(READY_RETRY_DELAY_MS).toBe(250);
    expect(MESSAGE_ATTEMPTS).toBe(2);
    expect(MESSAGE_RETRY_DELAY_MS).toBe(200);
  });

  it('define limite de XML', () => {
    expect(MAX_XML_BYTES).toBe(10 * 1024 * 1024);
  });
});
