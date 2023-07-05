import {
  sampleRUM,
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  initConversionTracking,
} from './lib-franklin.js';
import {
  analyticsTrackFormSubmission,
  analyticsTrackLinkClicks, createInlineScript, getAlloyInitScript,
  setupAnalyticsTrackingWithAlloy,
} from './lib-analytics.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list
window.hlx.RUM_GENERATION = 'conversion-testing'; // add your RUM generation information here

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    createInlineScript(document, document.body, getAlloyInitScript(), 'text/javascript');
    decorateMain(main);
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }
}

/**
 * Adds the favicon.
 * @param {string} href The favicon URL
 */
export function addFavIcon(href) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = href;
  const existingLink = document.querySelector('head link[rel="icon"]');
  if (existingLink) {
    existingLink.parentElement.replaceChild(link, existingLink);
  } else {
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  const headerLoaded = loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  addFavIcon(`${window.hlx.codeBasePath}/styles/favicon.svg`);
  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
  await headerLoaded;
  initConversionTracking(document);
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  const setupAnalytics = setupAnalyticsTrackingWithAlloy(document);
  loadDelayed();
  await setupAnalytics;
}

loadPage();

/**
 * Registers the 'convert' function to `sampleRUM` which sends
 * variant and convert events upon conversion.
 * The function will register a listener for an element if listenTo parameter is provided.
 * listenTo supports 'submit' and 'click'.
 * If listenTo is not provided, the information is used to track a conversion event.
 */
sampleRUM.drain('convert', (cevent, cvalueThunk, element, listenTo = []) => {
  async function trackConversion(celement) {
    const MAX_SESSION_LENGTH = 1000 * 60 * 60 * 24 * 30; // 30 days
    try {
      // get all stored experiments from local storage (unified-decisioning-experiments)
      const experiments = JSON.parse(localStorage.getItem('unified-decisioning-experiments'));
      if (experiments) {
        Object.entries(experiments)
          .map(([experiment, { treatment, date }]) => ({ experiment, treatment, date }))
          .filter(({ date }) => Date.now() - new Date(date) < MAX_SESSION_LENGTH)
          .forEach(({ experiment, treatment }) => {
            // send conversion event for each experiment that has been seen by this visitor
            sampleRUM('variant', { source: experiment, target: treatment });
          });
      }
      // send conversion event
      const cvalue = typeof cvalueThunk === 'function' ? await cvalueThunk(element) : cvalueThunk;
      sampleRUM('convert', { source: cevent, target: cvalue, element: celement });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('error reading experiments', e);
    }
  }

  function registerConversionListener(elements) {
    // if elements is an array or nodelist, register a conversion event for each element
    if (Array.isArray(elements) || elements instanceof NodeList) {
      elements.forEach((e) => registerConversionListener(e, listenTo, cevent, cvalueThunk));
    } else {
      listenTo.forEach((eventName) => element.addEventListener(
        eventName,
        (e) => trackConversion(e.target),
      ));
    }
  }

  if (element && listenTo.length) {
    registerConversionListener(element, listenTo, cevent, cvalueThunk);
  } else {
    trackConversion(element, cevent, cvalueThunk);
  }
});

// Declare conversionEvent, bufferTimeoutId and tempConversionEvent outside the convert function
// to persist them for buffering between
// subsequent convert calls
let bufferTimeoutId;
let conversionEvent;
let tempConversionEvent;

// call upon conversion events, pushes them to the datalayer
// call upon conversion events, sends them to alloy
sampleRUM.always.on('convert', async (data) => {
  const { element } = data;
  // eslint-disable-next-line no-undef
  if (element && alloy) {
    if (element.tagName === 'FORM') {
      conversionEvent = {
        event: 'Form Complete',
        ...(data.source ? { conversionName: data.source } : {}),
        ...(data.target ? { conversionValue: data.target } : {}),
      };

      if (conversionEvent.event === 'Form Complete' && (data.target === undefined || data.source === undefined)) {
        // If a buffer has already been set and tempConversionEvent exists,
        // merge the two conversionEvent objects to send to alloy
        if (bufferTimeoutId !== undefined && tempConversionEvent !== undefined) {
          conversionEvent = { ...tempConversionEvent, ...conversionEvent };
        } else {
          // Temporarily hold the conversionEvent object until the timeout is complete
          tempConversionEvent = { ...conversionEvent };

          // If there is partial form conversion data,
          // set the timeout buffer to wait for additional data
          bufferTimeoutId = setTimeout(async () => {
            await analyticsTrackFormSubmission(element, {
              conversion: {
                ...(conversionEvent.conversionName ? { conversionName: `${conversionEvent.conversionName}` } : {}),
                ...(conversionEvent.conversionValue ? { conversionValue: `${conversionEvent.conversionValue}` } : {}),
              },
            });
            tempConversionEvent = undefined;
            conversionEvent = undefined;
          }, 100);
        }
      }
    } else if (element.tagName === 'A') {
      conversionEvent = {
        event: 'Link Click',
        ...(data.source ? { conversionName: data.source } : {}),
        ...(data.target ? { conversionValue: data.target } : {}),
      };
      await analyticsTrackLinkClicks(element, 'other', {
        conversion: {
          ...(conversionEvent.conversionName ? { conversionName: `${conversionEvent.conversionName}` } : {}),
          ...(conversionEvent.conversionValue ? { conversionValue: `${conversionEvent.conversionValue}` } : {}),
        },
      });
      tempConversionEvent = undefined;
      conversionEvent = undefined;
    }
  }
});
