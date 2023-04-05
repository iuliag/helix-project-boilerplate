/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * Customer's XDM schema namespace
 * @type {string}
 */
const CUSTOM_SCHEMA_NAMESPACE = '_sitesinternal';

export function loadLaunch(callback) {
  const body = document.querySelector('body');
  const script = document.createElement('script');
  // script.src =
  // 'https://assets.adobedtm.com/51b39232f128/454afdc4eafe/launch-4ca876cfa7c7-development.min.js';
  script.src = 'https://assets.adobedtm.com/51b39232f128/454afdc4eafe/launch-9bb6b7204328-development.min.js';
  script.setAttribute('type', 'text/javascript');
  script.async = true;
  if (callback) {
    script.onload = callback;
  }
  body.appendChild(script);
  return script;
}

/**
 * Returns script that initializes a queue for each alloy instance,
 * in order to be ready to receive events before the alloy library is loaded
 * Documentation
 * https://experienceleague.adobe.com/docs/experience-platform/edge/fundamentals/installing-the-sdk.html?lang=en#adding-the-code
 * @type {string}
 */
function getAlloyInitScript() {
  return `!function(n,o){o.forEach(function(o){n[o]||((n.__alloyNS=n.__alloyNS||[]).push(o),n[o]=
  function(){var u=arguments;return new Promise(function(i,l){n[o].q.push([i,l,u])})},n[o].q=[])})}(window,["alloy"]);`;
}

export function loadAlloyInit(callback) {
  const body = document.querySelector('body');
  const script = document.createElement('script');
  script.innerHTML = getAlloyInitScript();
  script.setAttribute('type', 'text/javascript');
  if (callback) {
    script.onload = callback;
  }
  body.appendChild(script);
  return script;
}

/**
 * Basic tracking for page views with alloy
 * @param document
 * @param additionalXdmFields
 * @returns {Promise<*>}
 */
export async function analyticsTrackPageViews(document, additionalXdmFields = {}) {
  // eslint-disable-next-line no-undef
  return alloy('sendEvent', {
    documentUnloading: true,
    xdm: {
      eventType: 'web.webpagedetails.pageViews',
      web: {
        webPageDetails: {
          pageViews: {
            value: 1,
          },
          name: `${document.title}`,
        },
      },
      [CUSTOM_SCHEMA_NAMESPACE]: {
        ...additionalXdmFields,
      },
    },
  });
}
