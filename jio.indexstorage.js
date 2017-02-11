/**
 * JIO Index Storage Type = "Index".
 * Creates an index in a sub_storage using a worker-processor
 */
/*jslint indent: 2 */
/*global jIO, RSVP, Array*/
(function (self, jIO, RSVP, Array) {
  "use strict";

  /**
   * The JIO Index Storage extension
   *
   * @class IndexStorage
   * @constructor
   */
  function IndexStorage (spec) {
    if (!spec.sub_storage) {
      throw new jIO.util.jIOError("index storage requires a sub_storage.", 400);
    }
    
  }

  IndexStorage.prototype.post = function (index, content) {
  };

  IndexStorage.prototype.put = function (index, id, content) {
  };

  IndexStorage.prototype.get = function (index, id) {
  };

  IndexStorage.prototype.remove = function (index, id) {
  };
  
  IndexStorage.prototype.allDocs = function (index, options) {
  };
  
  IndexStorage.prototype.allAttachments = function (index, id, options) {
  };

  IndexStorage.prototype.removeAttachments = function (index, id, name) {
  };

  IndexStorage.prototype.putAttachments = function (index, id, name, content) {

  };

  IndexStorage.prototype.getAttachments = function (index, id, name, options) {

  };

  jIO.addStorage('index', IndexStorage);

}(self, jIO, RSVP, Array));

