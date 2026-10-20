function isDebugEnabled() {
  try {
    if (typeof globalThis.process !== 'undefined' && globalThis.process.env) {
      return globalThis.process.env.NFE_DEBUG === '1';
    }
  } catch {
    // Ignora ambientes sem process.
  }
  return false;
}

function timestamp() {
  return new Date().toISOString();
}

const debugLog = (...args) => {
  if (isDebugEnabled()) {
    console.info(`[NFe Ext ${timestamp()}]`, ...args);
  }
};

export const logger = {
  debug: debugLog,

  info: debugLog,

  warn(...args) {
    console.warn(`[NFe Ext ${timestamp()}]`, ...args);
  },

  error(...args) {
    console.error(`[NFe Ext ${timestamp()}]`, ...args);
  },
};
