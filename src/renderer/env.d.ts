import type { SmartsearchApi } from "../preload/index";

declare global {
  interface Window {
    smartsearch: SmartsearchApi;
  }
}

export {};
