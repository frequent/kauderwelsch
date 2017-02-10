/*jslint indent: 2 */
/*global window, rJS, RSVP */
(function (window, rJS, RSVP) {
  "use strict";

  var CONFIGURATION = {
    "type": "worker",
    "scope": "./",
    "url": "gadget_voxforge_serviceworker.js",
    "prefetch_url_list": ["VoxForgeDict.txt"],
    "sub_storage": {
      "type": "parallel",
      "storage_list": [{
        "type": "cache"
        }, {
        "type": "index",
        "processor": "gadget_voxforge_worker_processor.js",
        "sub_storage": {
          "type": "indexeddb",
          "database": "lexicon"
        }
      }]
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
