import { Component } from '@theme/component';
import { ThemeEvents, VariantUpdateEvent, ZoomMediaSelectedEvent } from '@theme/events';

/**
 * A custom element that renders a media gallery.
 *
 * @typedef {object} Refs
 * @property {import('./zoom-dialog').ZoomDialog} [zoomDialogComponent] - The zoom dialog component.
 * @property {import('./slideshow').Slideshow} [slideshow] - The slideshow component.
 * @property {HTMLElement[]} [media] - The media elements.
 *
 * @extends Component<Refs>
 */
export class MediaGallery extends Component {
  connectedCallback() {
    super.connectedCallback();

    const { signal } = this.#controller;
    const target = this.closest('.shopify-section, dialog');

    target?.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate, { signal });
    this.refs.zoomDialogComponent?.addEventListener(ThemeEvents.zoomMediaSelected, this.#handleZoomMediaSelected, {
      signal,
    });

    // Add mobile thumbnail click handlers for grid presentation
    if (this.presentation === 'grid') {
      this.#setupMobileThumbnailClicks();
    }
  }

  #controller = new AbortController();

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#controller.abort();
  }

  /**
   * Sets up click handlers for mobile thumbnails to switch main image.
   * Only active on mobile (viewport < 750px) for grid presentation.
   */
  #setupMobileThumbnailClicks() {
    const grid = this.querySelector('.media-gallery__grid');
    if (!grid) return;

    const { signal } = this.#controller;

    // Set initial selected state for first thumbnail
    const firstThumbnail = grid.querySelector('.product-media-container:not(:first-child)');
    if (firstThumbnail) {
      firstThumbnail.classList.add('thumbnail-selected');
    }

    // Use event delegation for better performance
    grid.addEventListener('click', (event) => {
      // Only handle on mobile
      if (window.innerWidth >= 750) return;

      // Find the clicked media container (thumbnail)
      if (!(event.target instanceof Element)) return;
      const clickedContainer = event.target.closest('.product-media-container:not(:first-child)');
      if (!clickedContainer) return;

      const firstContainer = grid.querySelector('.product-media-container:first-child');
      if (!firstContainer) return;

      // Remove selected class from all thumbnails
      grid.querySelectorAll('.product-media-container:not(:first-child)').forEach(container => {
        container.classList.remove('thumbnail-selected');
      });

      // Add selected class to clicked thumbnail
      clickedContainer.classList.add('thumbnail-selected');

      // Copy the content of clicked thumbnail to main image
      firstContainer.innerHTML = clickedContainer.innerHTML;

      // Smooth scroll to top of media gallery
      firstContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, { signal });
  }

  /**
   * Handles a variant update event by replacing the current media gallery with a new one.
   *
   * @param {VariantUpdateEvent} event - The variant update event.
   */
  #handleVariantUpdate = (event) => {
    const source = event.detail.data.html;

    if (!source) return;
    const newMediaGallery = source.querySelector('media-gallery');

    if (!newMediaGallery) return;

    this.replaceWith(newMediaGallery);
  };

  /**
   * Handles the 'zoom-media:selected' event.
   * @param {ZoomMediaSelectedEvent} event - The zoom-media:selected event.
   */
  #handleZoomMediaSelected = async (event) => {
    this.slideshow?.select(event.detail.index, undefined, { animate: false });
  };

  /**
   * Zooms the media gallery.
   *
   * @param {number} index - The index of the media to zoom.
   * @param {PointerEvent} event - The pointer event.
   */
  zoom(index, event) {
    this.refs.zoomDialogComponent?.open(index, event);
  }

  get slideshow() {
    return this.refs.slideshow;
  }

  get media() {
    return this.refs.media;
  }

  get presentation() {
    return this.dataset.presentation;
  }
}

if (!customElements.get('media-gallery')) {
  customElements.define('media-gallery', MediaGallery);
}
