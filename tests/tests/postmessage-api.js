// Sandstorm - Personal Cloud Sandbox
// Copyright (c) 2015 Sandstorm Development Group, Inc. and contributors
// All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

var utils = require('../utils');
var actionSelector = utils.actionSelector;
var appDetailsTitleSelector = utils.appDetailsTitleSelector;
var very_short_wait = utils.very_short_wait;
var short_wait = utils.short_wait;
var medium_wait = utils.medium_wait;
var very_long_wait = utils.very_long_wait;

module.exports = {
};

module.exports['Install and launch test app'] = function (browser) {
  browser
    .loginDevAccount()
    // test-3 introduces the JSON-formatted renderTemplate output
    .url(browser.launch_url + '/install/072f8f84638d03e4de150e8fc4d3bd15?url=https://alpha-hlngxit86q1mrs2iplnx.sandstorm.io/test-3.spk')
    .waitForElementVisible('#step-confirm', very_long_wait)
    .click('#confirmInstall')
    .url(browser.launch_url + "/apps/rwyva77wj1pnj01cjdj2kvap7c059n9ephyyg5k4s5enh5yw9rxh")
    .waitForElementVisible(appDetailsTitleSelector, short_wait)
    .assert.containsText(appDetailsTitleSelector, 'Test App')
    .waitForElementVisible(actionSelector, short_wait)
    .click(actionSelector)
    .waitForElementVisible('#grainTitle', medium_wait)
    .assert.containsText('#grainTitle', 'Untitled Test App test page')
    .frame('grain-frame')
      .waitForElementPresent('#randomId', medium_wait)
      .assert.containsText('#randomId', 'initial state')
    .frameParent()
    .url(undefined, function (response) {
      var grainUrl = response.value;
      var expectedGrainPrefix = browser.launch_url + '/grain/';
      browser.assert.ok(grainUrl.lastIndexOf(expectedGrainPrefix, 0) === 0, "url looks like a grain URL");
      grainId = grainUrl.slice(expectedGrainPrefix.length);
    });
};

var grainId = undefined;

module.exports['Test setPath'] = function (browser) {
  var expectedUrl = browser.launch_url + '/grain/' + grainId + '/#setpath';
  browser
    .frame('grain-frame')
      .click('#setPath')
      .pause(very_short_wait)
    .frameParent()
    .assert.urlEquals(expectedUrl);
    // Should link-sharing links be expected to also hold the current path?
    // If they don't, it's hard to link to specific pages in multi-page apps.
    // If they do, it might be surprising or problematic if the current view
    // is a more-privileged page than what you intend to share access to.
}

module.exports['Test setTitle'] = function (browser) {
  var origTitle = undefined;
  var randomValue = "" + Math.random();
  browser
    .getTitle(function (title) {
      origTitle = title;
    })
    .frame('grain-frame')
      .setValue('#title', [ randomValue ] )
      .click('#setTitle')
      .pause(very_short_wait)
    .frameParent()
    .assert.title(randomValue);
};

module.exports['Test setTitle to blank'] = function (browser) {
  var origTitle = undefined;
  var blank = "";
  browser
    .getTitle(function (title) {
      origTitle = title;
    })
    .frame('grain-frame')
      .clearValue('#title')
      .click('#setTitle')
      .pause(very_short_wait)
    .frameParent()
    .assert.title(blank);
};

module.exports['Test startSharing'] = function (browser) {
  browser
    .frame('grain-frame')
      .click('#startSharing')
    .frameParent()
    .waitForElementVisible('.popup.share', short_wait)
    .click('button.close-popup')
    .waitForElementNotPresent('.popup.share', short_wait)
};

module.exports['Test renderTemplate'] = function (browser) {
  browser
    .frame('grain-frame')
      .click('#renderTemplate')
      .waitForElementVisible('#template-frame[data-rendered=true]', short_wait)
      .frame('template-frame')
        .getText('#text', function (result) {
          this.assert.equal(typeof result, "object");
          this.assert.equal(result.status, 0);
          var renderedTemplate = result.value;
          var tokenInfo = JSON.parse(renderedTemplate);
          console.log(tokenInfo);
          this.assert.equal(typeof tokenInfo, "object");
          this.assert.equal(typeof tokenInfo.token, "string");
          this.assert.equal(typeof tokenInfo.host, "string");
          // Now, verify that we can actually use the API token.
          // Inject some JS into the browser that does an XHR and returns the body.
          this
            .timeouts("script", 5000)
            .executeAsync(function(tokenInfo, done) {
            var token = tokenInfo.token;
            var host = tokenInfo.host;
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
              if (xhr.readyState == 4) {
                if (xhr.status === 200) {
                  console.log("ok!")
                  console.log(xhr.responseText);
                  done(xhr.responseText);
                } else {
                  console.log("failed");
                  done(null);
                }
              }
            };
            var apiUrl = window.location.protocol + '//' + host;
            xhr.open("GET", apiUrl, true);
            xhr.setRequestHeader("Authorization", "Bearer " + token);
            xhr.send();
          }, [tokenInfo], function (result) {
            this.assert.equal(typeof result, "object");
            this.assert.equal(result.status, 0);
            this.assert.equal(typeof result.value, "string")
            var resp = JSON.parse(result.value);
            this.assert.equal(resp.state, "initial state\n");
          });
        })
      .frameParent()
    .frameParent()
    .end();
}
