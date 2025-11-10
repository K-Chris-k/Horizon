export {};

declare global {
  interface Shopify {
    country: string;
    currency: {
      active: string;
      rate: string;
    };
    designMode: boolean;
    locale: string;
    shop: string;
    loadFeatures(features: ShopifyFeature[], callback?: LoadCallback): void;
    ModelViewerUI?: ModelViewer;
    visualPreviewMode: boolean;
  }

  interface Theme {
    translations: Record<string, string>;
    placeholders: {
      general: string[];
      product: string[];
    };
    routes: {
      cart_add_url: string;
      cart_change_url: string;
      cart_update_url: string;
      cart_url: string;
      predictive_search_url: string;
      search_url: string;
    };
    utilities: {
      scheduler: {
        schedule: (task: () => void) => void;
      };
    };
    template: {
      name: string;
    };
  }

  interface Window {
    Shopify: Shopify;
  }

  declare const Shopify: Shopify;
  declare const Theme: Theme;

  type LoadCallback = (error: Error | undefined) => void;

  // Refer to https://github.com/Shopify/shopify/blob/main/areas/core/shopify/app/assets/javascripts/storefront/load_feature/load_features.js
  interface ShopifyFeature {
    name: string;
    version: string;
    onLoad?: LoadCallback;
  }

  // Refer to https://github.com/Shopify/model-viewer-ui/blob/main/src/js/model-viewer-ui.js
  interface ModelViewer {
    new (
      element: Element,
      options?: {
        focusOnPlay?: boolean;
      }
    ): ModelViewer;
    play(): void;
    pause(): void;
    toggleFullscreen(): void;
    zoom(amount: number): void;
    destroy(): void;
  }

  // Device Memory API - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
  interface Navigator {
    readonly deviceMemory?: number;
  }

  // View Transitions API - https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
  interface ViewTransition {
    readonly finished: Promise<void>;
    readonly ready: Promise<void>;
    readonly updateCallbackDone: Promise<void>;
    skipTransition(): void;
    types: Set<string>;
  }

  interface PageSwapEvent extends Event {
    readonly viewTransition: ViewTransition;
    readonly activation?: {
      readonly from?: NavigationHistoryEntry;
      readonly entry: NavigationHistoryEntry;
    };
  }

  interface PageRevealEvent extends Event {
    readonly viewTransition: ViewTransition;
  }

  interface NavigationHistoryEntry {
    readonly url?: string;
    readonly key: string;
    readonly id: string;
    readonly index: number;
    readonly sameDocument: boolean;
  }
}
