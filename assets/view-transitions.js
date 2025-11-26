(function () {
  //Remove the view transition render blocker if the user has reduced motion enabled
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const viewTransitionRenderBlocker = document.getElementById('view-transition-render-blocker');
    if (viewTransitionRenderBlocker) viewTransitionRenderBlocker.remove();
  }

  const idleCallback = typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout;

  // Track if user is actively scrolling
  let userIsActivelyScrolling = false;
  let allowAutoScroll = true;
  const autoScrollStopTime = Date.now() + 300; // Stop after 300ms
  
  // Detect real user scrolling
  let scrollEventCount = 0;
  window.addEventListener('scroll', () => {
    scrollEventCount++;
    const currentScrollTop = window.scrollY || document.documentElement.scrollTop;
    // If user scrolls away from top after initial load
    if (scrollEventCount > 3 && currentScrollTop > 50 && Date.now() > autoScrollStopTime) {
      userIsActivelyScrolling = true;
      allowAutoScroll = false;
    }
  }, { passive: true });
  
  // Detect touch scrolling
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });
  
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      const touchMoveY = e.touches[0].clientY;
      const touchDiff = Math.abs(touchMoveY - touchStartY);
      if (touchDiff > 30 && Date.now() > autoScrollStopTime) {
        userIsActivelyScrolling = true;
        allowAutoScroll = false;
      }
    }
  }, { passive: true });

  // Initial scroll to top
  window.scrollTo(0, 0);
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;

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
    
    // Smart scroll to top - only if user hasn't actively scrolled
    const smartScrollToTop = () => {
      if (allowAutoScroll && !userIsActivelyScrolling && Date.now() <= autoScrollStopTime) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      }
    };
    
    smartScrollToTop();
    
    // A few quick attempts within the time window
    requestAnimationFrame(() => {
      smartScrollToTop();
      requestAnimationFrame(() => {
        smartScrollToTop();
      });
    });
    
    // Clean up sessionStorage flag
    const shouldScrollToTop = sessionStorage.getItem('scrollToTopOnLoad');
    if (shouldScrollToTop === 'true') {
      setTimeout(() => {
        sessionStorage.removeItem('scrollToTopOnLoad');
      }, 500);
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
      // Mark that we're navigating to a product page
      sessionStorage.setItem('scrollToTopOnLoad', 'true');
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

    // Smart scroll to top - respects user interaction
    const smartScrollToTop = () => {
      if (allowAutoScroll && !userIsActivelyScrolling && Date.now() <= autoScrollStopTime) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      }
    };
    
    smartScrollToTop();

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

    // Scroll to top after view transition completes
    await viewTransition.finished;
    
    // Clean up the scrollToTop flag
    if (shouldScrollToTop === 'true') {
      setTimeout(() => {
        sessionStorage.removeItem('scrollToTopOnLoad');
      }, 500);
    }
    
    // A few smart scroll attempts within the time window
    smartScrollToTop();
    requestAnimationFrame(() => {
      smartScrollToTop();
      requestAnimationFrame(() => {
        smartScrollToTop();
      });
    });
  });
})();
