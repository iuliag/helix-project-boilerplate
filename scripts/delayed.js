// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './lib-franklin.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

// add more delayed functionality here
// faking a data layer change
if (window.adobeDataLayer) {
  window.adobeDataLayer.push({
    event: 'Form Complete',
    eventInfo: {
      form: {
        formId: '12345',
      },
      experiment: {
        experimentId: 'pricing',
        experimentVariant: 'challenger-1',
      },
    },
  });
}
