(function () {
  //Remove the view transition render blocker if the user has reduced motion enabled
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const viewTransitionRenderBlocker = document.getElementById('view-transition-render-blocker');
    if (viewTransitionRenderBlocker) viewTransitionRenderBlocker.remove();
  }

  const idleCallback = typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout;

  // Track user interaction to avoid interrupting user scrolling
  let userHasInteracted = false;
  ['scroll', 'wheel', 'touchmove', 'touchstart', 'mousedown', 'keydown'].forEach(eventName => {
    window.addEventListener(eventName, () => { userHasInteracted = true; }, { once: true, passive: true });
  });

  // Force scroll to top on every page load (before any view transition)
  // This is critical for view transitions which may try to preserve scroll position
  // But only if user hasn't started interacting
  if (!userHasInteracted && window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }

  /**
   * Checks whether an Event object is carrying a `viewTransition` property
   * (as used by the View Transition API) and narrows the type accordingly.
   *
   * @template {Event} T
   * @param {T} event
   * @returns {event is T & { viewTransition: ViewTransition }}
   */
  function hasViewTransition(event) {
    return 'viewTransition' in event && event.viewTransition != null;
  }

  // Handle scroll to top for page navigation without view transitions
  window.addEventListener('pagereveal', (event) => {
    if (hasViewTransition(event)) return;
    // No view transition, scroll to top immediately (but respect user interaction)
    if (!userHasInteracted) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    
    // Clean up sessionStorage flag
    const shouldScrollToTop = sessionStorage.getItem('scrollToTopOnLoad');
    if (shouldScrollToTop === 'true') {
      setTimeout(() => {
        sessionStorage.removeItem('scrollToTopOnLoad');
      }, 100);
    }
  });

  /**
   * @param {PageSwapEvent} event
   */
  window.addEventListener('pageswap', async (event) => {
    if (!hasViewTransition(event)) return;

    const { viewTransition } = event;

    // Cancel view transition on user interaction to improve INP (Interaction to Next Paint)
    ['pointerdown', 'keydown'].forEach(eventName => {
      document.addEventListener(eventName, () => {
        viewTransition.skipTransition();
      }, { once: true });
    });

    // Clean in case you landed on the pdp first. We want to remove the default transition type on the PDP media gallery so there is no duplicate transition name
    document
      .querySelectorAll('[data-view-transition-type]:not([data-view-transition-triggered])')
      .forEach((element) => {
        element.removeAttribute('data-view-transition-type');
      });

    const transitionTriggered = document.querySelector('[data-view-transition-triggered]');
    const transitionType = transitionTriggered?.getAttribute('data-view-transition-type');

    if (transitionType) {
      viewTransition.types.clear();
      viewTransition.types.add(transitionType);
      sessionStorage.setItem('custom-transition-type', transitionType);
    } else {
      viewTransition.types.clear();
      viewTransition.types.add('page-navigation');
      sessionStorage.removeItem('custom-transition-type');
    }
  });

  /**
   * @param {PageRevealEvent} event
   */
  window.addEventListener('pagereveal', async (event) => {
    if (!hasViewTransition(event)) return;

    const { viewTransition } = event;
    const customTransitionType = sessionStorage.getItem('custom-transition-type');
    const shouldScrollToTop = sessionStorage.getItem('scrollToTopOnLoad');

    // Immediately scroll to top before the transition starts rendering (but respect user interaction)
    if (!userHasInteracted) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (customTransitionType) {
      viewTransition.types.clear();
      viewTransition.types.add(customTransitionType);

      await viewTransition.finished;

      viewTransition.types.clear();
      viewTransition.types.add('page-navigation');

      idleCallback(() => {
        sessionStorage.removeItem('custom-transition-type');
        document.querySelectorAll('[data-view-transition-type]').forEach((element) => {
          element.removeAttribute('data-view-transition-type');
        });
      });
    } else {
      viewTransition.types.clear();
      viewTransition.types.add('page-navigation');
    }

    // Scroll to top after view transition completes (double insurance, but respect user interaction)
    await viewTransition.finished;
    
    // Clean up the scrollToTop flag
    if (shouldScrollToTop === 'true') {
      setTimeout(() => {
        sessionStorage.removeItem('scrollToTopOnLoad');
      }, 100);
    }
    
    // Use requestAnimationFrame to ensure it happens after any other scroll restoration
    // But only if user hasn't interacted
    if (!userHasInteracted) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'instant' });
        });
      });
    }
  });
})();
