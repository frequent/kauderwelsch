(function (worker_instance) {
  "use strict";

  // JavaScript Audio Resampler
  // Copyright (C) 2011-2015 Grant Galitz
  // Released to Public Domain
  // https://github.com/taisel/XAudioJS/blob/master/resampler.js

  // Note: audio resampling is very similar to image resizing: say you've got
  // a 16 x 16 image, but you want it to fill a 32x32 area: you resize
  // (resample) it. the result has less quality (it can be blurry or edgy,
  // depending on the resizing algorithm), but it works, and the resized
  // image takes up less space. Resampled audio is exactly the same — you
  // save space, but in practice you will be unable to properly reproduce high
  // frequency content (treble sound).

  var INCORRECT_BUFFER_LENGTH = "Buffer was of incorrect sample length.";
  var INCORRECT_SETTINGS = "Invalid settings specified for the resampler.";

  // configurable parameters
  var CHANNELS = null;
  var OUTPUT_BUFFER_SIZE = null;
  var NO_RETURN = null;

  //
  var RATIO_WEIGHT = null;
  var LAST_WEIGHT = null;
  var TAIL_EXISTS = null;
  var OUTPUT_BUFFER = null;
  var LAST_OUTPUT = null;

  var RESAMPLER = {};

  RESAMPLER.initialize = function(fromSampleRate, toSampleRate, channels, outputBufferSize, noReturn) {

    if (!fromSampleRate || !toSampleRate || !channels) {
      return {"error": true, "message": INCORRECT_SETTINGS};
    }

    CHANNELS = channels;
    OUTPUT_BUFFER_SIZE = outputBufferSize;
    NO_RETURN = noReturn;

    // Setup resampler bypass - just return
    if (fromSampleRate == toSampleRate) {
      RATIO_WEIGHT = 1;
      RESAMPLER.resampler = byPassResampler;
    } else {

      // Use generic linear interpolation if upsampling,
      // as linear interpolation produces a gradient that we want
      // and works fine with two input sample points per output in this case.
      if (fromSampleRate < toSampleRate) {
        LASTWEIGHT = 1;
        RESAMPLER.resample = linearInterpolation;

      // Custom resampler I wrote that doesn't skip samples
      // like standard linear interpolation in high downsampling.
      // This is more accurate than linear interpolation on downsampling.
      } else {
        LAST_WEIGHT = 0;
        TAIL_EXISTS = false;
        RESAMPLER.resample = multiTap;
      }
      
      // Initialize the internal buffer:
      initializeBuffers();
      RATIO_WEIGHT = fromSampleRate / toSampleRate;
    }
  };

  // utility methods
  function initializeBuffers () {
    try {
      OUTPUT_BUFFER = new Float32Array(OUTPUT_BUFFER_SIZE);
      LAST_OUTPUT = new Float32Array(CHANNELS);
    }
    catch (error) {
      OUTPUT_BUFFER = [];
      LAST_OUTPUT = [];
    }
  }

  function byPassResampler (buffer) {
    // set the buffer passed as our own, as we don't need to resample it
    if (NO_RETURN) {
      OUTPUT_BUFFER = buffer;
      return buffer.length;
    }

    // just return the buffer passsed
    return buffer;
  }

  function bufferSlice (sliceAmount) {

    // If we're going to access the properties directly from this object:
    if (NO_RETURN) {
      return sliceAmount;
    }

    //Typed array and normal array buffer section referencing:
    try {
      return OUTPUT_BUFFER.subarray(0, sliceAmount);
    }
    catch (error) {
      try {
        //Regular array pass:
        OUTPUT_BUFFER.length = sliceAmount;
        return OUTPUT_BUFFER;
      }
      catch (error) {
        //Nightly Firefox 4 used to have the subarray function named as slice:
        return OUTPUT_BUFFER.slice(0, sliceAmount);
      }
    }
  }

  function linearInterpolation (buffer) {
    var bufferLength = buffer.length,
      channels = CHANNELS,
      outLength,
      ratioWeight,
      weight,
      firstWeight,
      secondWeight,
      sourceOffset,
      outputOffset,
      outputBuffer,
      channel;

    if ((bufferLength % channels) !== 0) {
      return {"error": true, "message": INCORRECT_SETTINGS};
    }
    if (bufferLength <= 0) {
      return (NO_RETURN) ? 0 : [];
    }

    outLength = OUTPUT_BUFFER_SIZE;
    ratioWeight = RATIO_WEIGHT;
    weight = LAST_WEIGHT;
    firstWeight = 0;
    secondWeight = 0;
    sourceOffset = 0;
    outputOffset = 0;
    outputBuffer = OUTPUT_BUFFER;

    for (; weight < 1; weight += ratioWeight) {
      secondWeight = weight % 1;
      firstWeight = 1 - secondWeight;
      LAST_WEIGHT = weight % 1;
      for (channel = 0; channel < CHANNELS; ++channel) {
        outputBuffer[outputOffset++] = (LAST_OUTPUT[channel] * 
          firstWeight) + (buffer[channel] * secondWeight);
      }
    }
    weight -= 1;
    for (bufferLength -= channels, sourceOffset = Math.floor(weight) * 
      channels; outputOffset < outLength && sourceOffset < bufferLength;) {
      secondWeight = weight % 1;
      firstWeight = 1 - secondWeight;
      for (channel = 0; channel < CHANNELS; ++channel) {
        outputBuffer[outputOffset++] = 
          (buffer[sourceOffset((channel > 0) ? (" + " + channel) : "")] * 
            firstWeight) + (buffer[sourceOffset(channels + channel)] * 
              secondWeight);
      }
      weight += ratioWeight;
      sourceOffset = Math.floor(weight) * channels;
    }
    for (channel = 0; channel < channels; ++channel) {
      LAST_OUTPUT[channel] = buffer[sourceOffset++];
    }
    return bufferSlice(outputOffset);
  }

  function multiTap (buffer) {
    var bufferLength = buffer.length,
      channels = CHANNELS,
      outLength,
      output_variable_list,
      ratioWeight,
      weight,
      channel,
      actualPosition,
      amountToNext,
      alreadyProcessedTail,
      outputBuffer,
      outputOffset,
      currentPosition;

    if ((bufferLength % channels) !== 0) {
      return {"error": true, "message": INCORRECT_SETTINGS};
    }
    if (bufferLength <= 0) {
      return (NO_RETURN) ? 0 : [];
    }

    outLength = OUTPUT_BUFFER_SIZE;
    output_variable_list = [];
    ratioWeight = RATIO_WEIGHT;
    weight = 0;
    actualPosition = 0;  
    amountToNext = 0;
    alreadyProcessedTail = !TAIL_EXISTS;
    TAIL_EXISTS = false;
    outputBuffer = OUTPUT_BUFFER;
    outputOffset = 0;
    currentPosition = 0;
          
    for (channel = 0; channel < channels; ++channel) {
      output_variable_list[channel] = 0;
    }

    do {
      if (alreadyProcessedTail) {
        weight = ratioWeight;
        for (channel = 0; channel < channels; ++channel) {
          output_variable_list[channel] = 0;
        }
      } else {
        weight = LAST_WEIGHT;
        for (channel = 0; channel < channels; ++channel) {
          output_variable_list[channel] = LAST_OUPUT[channel];
        }
        alreadyProcessedTail = true;
      }
      while (weight > 0 && actualPosition < bufferLength) {
        amountToNext = 1 + actualPosition - currentPosition;
        if (weight >= amountToNext) {
          for (channel = 0; channel < channels; ++channel) {
            output_variable_list[channel] += buffer[actualPosition++] 
              * amountToNext;
          }
          currentPosition = actualPosition;
          weight -= amountToNext;
        } else {
          for (channel = 0; channel < channels; ++channel) {
            output_variable_list[channel] += buffer[actualPosition + 
              ((channel > 0) ? (" + " + channel) : "")] * weight;
          }
          currentPosition += weight;
          weight = 0;
          break;
        }
      }
          
      if (weight === 0) {
        for (channel = 0; channel < channels; ++channel) {
          outputBuffer[outputOffset++] = output_variable_list[channel] / 
            ratioWeight;
        }
      } else {
        LAST_WEIGHT = weight;
        for (channel = 0; channel < channels; ++channel) {
          LAST_OUTPUT[channel] = output_variable_list[channel];
        }
        TAIL_EXISTS = true;
        break;
      }
    } while (actualPosition < bufferLength && outputOffset < outLength);
    return bufferSlice(outputOffset);
  }
  
  // http://stackoverflow.com/questions/27598270/resample-audio-buffer-from-44100-to-16000
  // Get an OfflineAudioContext at 16000Hz (the target sample rate). 
  // durationInSamples is the number of audio samples = 
  // @441kHz = 44100 samples per second
  // channels is the number of channels (1 for mono, 2 for stereo).
  // XXX move to recorder

  /* not supported in Chrome...
  function downSample(current_rate, target_rate, channels, buffer) {
    var bufferLen = buffer.length, 
      offlineCtx = new OfflineAudioContext(1, bufferLen, 16000),
      emptyBuffer = offlineCtx.createBuffer(channels, bufferLen, 44100),
      channel,
      source,
      buff,
      i;

    // copy data into AudioBuffer
    for (channel = 0; i < channels; channels++) {
      buff = emptyBuffer.getChannelData(channel);
      for (i = 0; i < bufferLen; i += 1) {
        buff[i] = buffer[i];
      }
    }

    // play
    source = offlineCtx.createBufferSource();
    source.buffer = emptyBuffer;
    source.connect(offlineCtx.destionation);
    source.start(0);
    
    offlineCtx.oncomplete = function (audiobuffer) {
      // audiobuffer contains audio resampled at 16000Hz, use
      // audiobuffer.getChannelData(x) to get an ArrayBuffer for
      // channel x
      return audiobuffer.getChannelData(0);
    };
    return offlineCtx.startRendering();
  }
  */
  
  // error handling
  // worker_instance.close();

  worker_instance.resampler = RESAMPLER;

}(self));