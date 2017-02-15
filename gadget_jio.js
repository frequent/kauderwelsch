/*jslint indent: 2 */
/*global window, rJS, jIO */
(function (window, rJS, jIO) {
  "use strict";

  /////////////////////////////
  // some methods
  /////////////////////////////

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    
    /////////////////////////////
    // state
    /////////////////////////////
    .setState({"jio_storage": null})

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    
    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod('createJio', function (jio_options) {
      return this.changeState({"jio_storage": jIO.createJIO(jio_options)});
    })
    .declareMethod('allDocs', function () {
      var storage = this.state.jio_storage;
      return storage.allDocs.apply(storage, arguments);
    })
    .declareMethod('allAttachments', function () {
      var storage = this.state.jio_storage;
      return storage.allAttachments.apply(storage, arguments);
    })
    .declareMethod('get', function () {
      var storage = this.state.jio_storage;
      return storage.get.apply(storage, arguments);
    })
    .declareMethod('put', function () {
      var storage = this.state.jio_storage;
      return storage.put.apply(storage, arguments);
    })
    .declareMethod('post', function () {
      var storage = this.state.jio_storage;
      return storage.post.apply(storage, arguments);
    })
    .declareMethod('remove', function () {
      var storage = this.state.jio_storage;
      return storage.remove.apply(storage, arguments);
    })
    .declareMethod('getAttachment', function () {
      var storage = this.state.jio_storage;
      return storage.getAttachment.apply(storage, arguments);
    })
    .declareMethod('putAttachment', function () {
      var storage = this.state.jio_storage;
      return storage.putAttachment.apply(storage, arguments);
    })
    .declareMethod('removeAttachment', function () {
      var storage = this.state.jio_storage;
      return storage.removeAttachment.apply(storage, arguments);
    })
    .declareMethod('repair', function () {
      var storage = this.state.jio_storage;
      return storage.repair.apply(storage, arguments);
    });
  
    /////////////////////////////
    // declared services
    /////////////////////////////

}(window, rJS, jIO));