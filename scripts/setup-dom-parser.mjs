import { DOMParser } from '@xmldom/xmldom';
// Polyfill exclusivo dos testes Node; browsers usam DOMParser nativo.
globalThis.DOMParser = DOMParser;
