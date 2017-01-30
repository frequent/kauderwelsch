/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, navigator */
(function (window, rJS) {
  "use strict";

  var SW = navigator.serviceWorker;

  /////////////////////////////
  // some methods
  /////////////////////////////
  
  // Custom loopEventListener
  function customLoopEventListener(my_target, my_type, my_callback) {
    var handle_event_callback,
      callback_promise;

    function cancelResolver() {
      if ((callback_promise !== undefined) &&
        (typeof callback_promise.cancel === "function")) {
        callback_promise.cancel();
      }
    }
    function canceller() {
      cancelResolver();
    }
    function itsANonResolvableTrap(resolve, reject) {
      handle_event_callback = function (evt) {
        cancelResolver();
        callback_promise = new RSVP.Queue()
          .push(function () {
            return my_callback(evt);
          })
          .push(undefined, function (error) {
            if (!(error instanceof RSVP.CancellationError)) {
              canceller();
              reject(error);
            }
          });
      };
      // eg object.onfirstpass = function () {...
      my_target["on" + my_type] = my_callback;
    }
    return new RSVP.Promise(itsANonResolvableTrap, canceller);
  }

  function logChange(my_event) {
    console.log('Controller change: ', my_event);
  }

  function installServiceWorker(my_option_dict) {
    return new RSVP.Queue()
      .push(function () {
        return SW.getRegistration();
      })
      .push(function (is_registered_worker) {
        
        // XXX What if this isn't mine?
        if (!is_registered_worker) {
          return SW.register(
            my_option_dict.serviceworker_url || 'serviceworker.js', {
              "scope": my_option_dict.scope || './'
            }
          );   
        }
        return is_registered_worker;
      });
  }

  function waitForInstallation(registration) {
    return new RSVP.Promise(function(resolve, reject) {
      if (registration.installing) {
        // If the current registration represents the "installing" service
        // worker, then wait until the installation step completes (during
        // which any defined resources are pre-fetched) to continue.
        registration.installing.addEventListener('statechange', function(e) {
          if (e.target.state == 'installed') {
            resolve(registration);
          } else if (e.target.state == 'redundant') {
            reject(e);
          }
        });
      } else {
        // Otherwise, if this isn't the "installing" service worker, then
        // installation must have beencompleted during a previous visit to this
        // page, and the any resources will already have benn pre-fetched So
        // we can proceed right away.
        resolve(registration);
      }
    });
  }

  // refreshing should not be necessary if scope is claimed on activate
  function claimScope(registration) {
    return new RSVP.Promise(function (resolve, reject) {
      if (registration.active.state === 'activated') {
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
    //  return new RSVP.Queue()
    //    .push(function () {
    //      return my_gadget.getElement();
    //    })
    //    .push(function (my_element) {
    //      my_gadget.property_dict.element = my_element;
    //    });
    })

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod('render', function (my_option_dict) {
      var gadget = this;
      
      if (!SW) {
        throw new Error("Browser does not support serviceworker.");
      }

      return new RSVP.Queue()
        .push(function () {
          return RSVP.any([
            installServiceWorker(my_option_dict),
            customLoopEventListener(SW, "controllerchange", false, logChange)
          ]);
        })
        .push(function (my_promise_list) {
          return waitForInstallation(my_promise_list);
        })
        .push(function (installation) {
          return claimScope(installation);
        })
        .push(function () {
          return gadget;
        })
        .push(null, function (my_error) {
          console.log(my_error);
          throw my_error;
        });
    });

}(window, rJS, navigator));
