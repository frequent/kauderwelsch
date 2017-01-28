/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, navigator */
(function (window, rJS) {
  "use strict";

  /////////////////////////////
  // some methods
  /////////////////////////////

  function waitForInstallation(registration) {
    return new RSVP.Promise(function(resolve, reject) {
      if (registration.installing) {
        // If the current registration represents the "installing" service
        // worker, then wait until the installation step completes (during
        // which any defined resources are pre-fetched) to continue.
        registration.installing.addEventListener('statechange', function(e) {
          if (e.target.state == 'installed') {
            resolve();
          } else if (e.target.state == 'redundant') {
            reject(e);
          }
        });
      } else {
        // Otherwise, if this isn't the "installing" service worker, then
        // installation must have beencompleted during a previous visit to this
        // page, and the any resources will already have benn pre-fetched So
        // we can proceed right away.
        resolve();
      }
    });
  }

  // refreshing should not be necessary if scope is claimed on activate
  function claimScope(installation) {
    return new RSVP.Promise(function (resolve, reject) {
      if (navigator.serviceWorker.controller) {
        resolve();
      } else {
        reject(new Error("Please refresh to initialize serviceworker."));
      }
    });
  }

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function (my_gadget) {
      my_gadget.property_dict = {};
      return new RSVP.Queue()
        .push(function () {
          return my_gadget.getElement();
        })
        .push(function (my_element) {
          my_gadget.property_dict.element = my_element;
        });
    })

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod('render', function (my_option_dict) {
      var gadget = this;

      if ('serviceWorker' in navigator) {
        return new RSVP.QUeue()
          .push(function () {
            return navigator.serviceWorker.register(
              my_option_dict.serviceworker_url || 'serviceworker.js',
              {scope: my_option_dict.scope || './'}
            );
          })
          .push(function (registration) {
            return waitForInstallation(registration);
          })
          .push(function (installation) {
            return claimScope(installation);
          })
          .push(null, function (my_error) {
            console.log(my_error);
            throw my_error;
          });
      } else {
        throw new Error("Browser does not support serviceworker.");
      }
    });

}(window, rJS, navigator));

