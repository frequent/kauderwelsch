/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, navigator, RSVP */
(function(window, navigator, RSVP, undefined) {

  var AUDIO_CONTEXT = window.AudioContext || window.webkitAudioContext;
  var MEDIA_DEVICES = navigator.mediaDevices;

  function Kauderwelsch(my_option_dict) {
    var kauderwelsch_instance = this,
      option_dict = my_option_dict || {};

    if (!AUDIO_CONTEXT) {
      throw new TypeError("Browser does not support AudioContext");
    }
    if (!MEDIA_DEVICES) {
      throw new TypeError("Browser does not support navigator.MediaDevices");
    }

    // Load Kauderwelsch worker
    kauderwelsch_instance.trainer = new Worker(option_dict.pathToTrainer || 'trainer_worker.js');

    // initialize audio recording and file storing
  }

  window.kw = Kauderwelsch;

}(window, window.navigator, RSVP));
