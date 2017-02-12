/*jslint indent: 2 */
/*global window, rJS, RSVP */
(function (window, rJS, RSVP) {
  "use strict";

  var CONFIGURATION = {
    "type": "worker",
    "scope": "./",
    "url": "gadget_voxforge_serviceworker.js",
    "prefetch_url_list": ["sample.txt"],
    "sub_storage": {
      "type": "parallel",
      "storage_list": [{
        "type": "index",
        "index_generator": "gadget_voxforge_worker_processor.js",
        "index_storage": {
          "type": "indexeddb",
          "database": "lexicon"
        },
        "sub_storage": {
          "type": "cache",
          "version": 1
          }
        }
      ]
    }
  };

  /////////////////////////////
  // some methods
  /////////////////////////////

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      return this.getDeclaredGadget("voxforge")
        .push(function (my_voxforge_gadget) {
          return my_voxforge_gadget.render(CONFIGURATION);
        })
        .push(null, function (my_error) {
          console.log(my_error);
          throw my_error;
        });
    });

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    
    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////

    /////////////////////////////
    // declared service
    /////////////////////////////

}(window, rJS, RSVP));

