let audioCtx, analyser;
let visualiser = null;
// Set up the interval meter.
// 5: number of samples to measure over r
// 200: millisecond expected length of pulse (to avoid counting several times for same sound)
//      setting this too high will mean that legit pulses will be ignored
let intervalMeter = new IntervalMeter(5, 200);

if (document.readyState != 'loading') {
  onDocumentReady();
} else {
  document.addEventListener('DOMContentLoaded', onDocumentReady);
}



const trimGain = -45;


//speed for balloon
let shrinkSpeed = 5;
let fillSpeed = 3;

let orgSize = 25;
let ballon = { 
  x: 0, 
  y: 0, 
  size: orgSize,
  color: 'rgb(0, 255, 0)',
};


// Main initialisation, called when document is loaded and ready.
function onDocumentReady() {
  visualiser = new Visualiser(document.getElementById('visualiser'));
  visualiser.setExpanded(false); // Collapse at startup

  // Initalise microphone
  navigator.getUserMedia(
    { audio: true },
    onMicSuccess, // call this when ready
    error => { console.error('Could not init microphone', error); });

  setInterval(updateDisplay, 300);
}

// Microphone successfully initalised, we now have access to audio data
function onMicSuccess(stream) {
  audioCtx = new AudioContext();

  audioCtx.addEventListener('statechange', () => {
    console.log('Audio context state: ' + audioCtx.state);
  });

  analyser = audioCtx.createAnalyser();

  // fftSize must be a power of 2. Higher values slower, more detailed
  // Range is 32-32768
  analyser.fftSize = 1024;

      //128?      

  // smoothingTimeConstant ranges from 0.0 to 1.0
  // 0 = no averaging. Fast response, jittery
  // 1 = maximum averaging. Slow response, smooth
  analyser.smoothingTimeConstant = 0.8;

  // Low and high shelf filters. Gain is set to 0 so they have no effect
  // could be useful for excluding background noise.
  const lowcut = audioCtx.createBiquadFilter();
  lowcut.type = "lowshelf";
  lowcut.frequency.value = 0;
  lowcut.gain.value = 0;

  const highcut = audioCtx.createBiquadFilter();
  highcut.type = "highshelf";
  highcut.frequency.value = 500;
  highcut.gain.value = 0;

  // Microphone -> filters -> analyser
  const micSource = audioCtx.createMediaStreamSource(stream);
  micSource.connect(lowcut);
  lowcut.connect(highcut);
  highcut.connect(analyser);

  // Start loop
  window.requestAnimationFrame(analyse);
}

// Sets background colour and prints out interval info
function updateDisplay() {
  // Calculate interval and derive BPM (if interval is above 0)
  const currentIntervalMs = intervalMeter.calculate();
  const currentBpm = currentIntervalMs ? parseInt(1.0 / (currentIntervalMs / 1000.0) * 60.0) : 0;

  // Use 300ms as an arbitrary limit (ie. fastest)
  let relative = 300 / currentIntervalMs;

  // Clamp value beteen 0.0->1.0
  if (relative > 1.0) relative = 1; if (relative < 0) relative = 0;

  // Make some hue and lightness values from this percentage
  const h = relative * 360;
  const l = relative * 80;

  // Update text readout
  document.getElementById('intervalMs').innerText = parseInt(currentIntervalMs) + ' ms.';
  document.getElementById('intervalBpm').innerText = currentBpm + ' bpm.';


//Beat triggering

let divide = 25;
let moveBeat = 10;

if (currentBpm == 0 || currentBpm > 200) {
  //Nothing
} else if (currentBpm < 100) {
  ballon.x += moveBeat;
} else {
  ballon.x -= moveBeat;
}

  /*
  else if (currentBpm < 50) {
    ballon.x += moveBeat;
  } else if (currentBpm > 50 && currentBpm < 100) {
    ballon.x -= moveBeat;
  }
*/
  // Set colour
  document.body.style.backgroundColor = 'hsl(' + h + ', 100%, ' + l + '%)';
}

// Returns TRUE if the threshold value is hit between the given frequency range
// Note that FFT size & smoothing has an averaging effect
function thresholdFrequency(lowFreq, highFreq, freqData, threshold) {
  const samples = sampleData(lowFreq, highFreq, freqData);
  let max = Number.MIN_SAFE_INTEGER;
  for (var i = 0; i < samples.length; i++) {
    if (samples[i] > threshold) return true;
    max = Math.max(max, samples[i]);
  }

  // For debugging it can be useful to see maximum value within range
  //console.log('Freq max: ' + max);
  return false;
}

// Returns TRUE if the data hits a peak threshold at any point
// Higher FFT sizes are needed to detect shorter pulses.
function thresholdPeak(waveData, threshold) {
  let max = Number.MIN_SAFE_INTEGER;
  for (var i = 0; i < waveData.length; i++) {
    // Need to use Math.abs to swap negatives into positive
    if (Math.abs(waveData[i]) > threshold) return true;
    max = Math.max(max, Math.abs(waveData[i]));
  }
  // For debugging it can be useful to see maximum value within range
  //console.log('Peak max: ' + max * 10000);
  return false;
}

// Returns TRUE if the average amplitude is above threshold across the whole snapshot
// Smaller FFT sizes will have a similar averaging effect
function thresholdSustained(waveData, threshold) {
  let total = 0;
  for (var i = 0; i < waveData.length; i++) {
    // Use Math.abs to swap negatives into positive
    total += Math.abs(waveData[i]);
  }
  const avg = total / waveData.length;

  // For debugging it can be useful to see computed average values
  // console.log('Sustained avg: ' + avg);
  return avg >= threshold;
}

function sampleData(lowFreq, highFreq, freqData) {
  // getIndexForFrequency is a function from util.js
  // it gives us the array index for a given freq
  const lowIndex = getIndexForFrequency(lowFreq, analyser);
  const highIndex = getIndexForFrequency(highFreq, analyser);

  // Grab a 'slice' of the array between these indexes
  const samples = freqData.slice(lowIndex, highIndex);
  return samples;
}


//CANVAS
let canvas = document.getElementById('ballons');
let ctx = canvas.getContext('2d');

function centerBallon() {
  let os = ballon.size;

  let wt = canvas.width;
  let ht = canvas.height;
  ballon.x = wt/2;
  ballon.y = ht/2;

  drawCanvas();
}

function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(ballon.x, ballon.y, ballon.size, 0, 2 * Math.PI);
  ctx.fillStyle = ballon.color;
  ctx.fill();
}

//centerBallon();

/*
function animate() {
  requestAnimationFrame(animate);
  drawCanvas();
}

animate();
*/
let popSpeed = 1;


function popBalloon() {
  let ogColor = ballon.color;

  if (ballon.size > 0) {
    ballon.color = 'rgb(255, 0, 0)';
    setTimeout(function() {
      ballon.size -= popSpeed;
      window.requestAnimationFrame(popBalloon);
      popSpeed = popSpeed * 1.2;
    }, );
  } else {
    ballon.color = 'rgb(0, 255, 0)';
  
    setTimeout(function() {
      ballon.size = orgSize;
      centerBallon();
    }, 1000);
  }
};

function turnOffSize() {
  shrinkSpeed = 0;
  fillSpeed = 0;
};


let keyA = 13;
let keyB = 17;
let keyC = 27;

//Here we assign bucket and an action for that
let analysisArray = [
  {
    freq: 17,
    action: function() {
      console.log('low');

      //Shrink balloon here
      //if (ballon.size <= 1) {
      //  ballon.size = 1;
      //} else {
      //  ballon.size -= fillSpeed;
      //}      
    }
  },
  {
    freq: 30,
    action: function() {
      console.log('pop');
      
      //Shrink balloon here
      popBalloon();
      console.log(ballon.size);
    }
  },
  {
    freq: 23,
    action: function() {
      if (ballon.size > 100) {
        popBalloon();
      } else {
      console.log('high');

      //Shrink balloon here
      //ballon.size += fillSpeed;
      ballon.y -= 8;
      ballon.size += fillSpeed;
      }
    }
  }
];


let keyGain = -55;


function analyse() {
  const bins = analyser.frequencyBinCount;

  // Get frequency and amplitude data
  const freq = new Float32Array(bins);
  const wave = new Float32Array(bins);
  analyser.getFloatFrequencyData(freq);
  analyser.getFloatTimeDomainData(wave);

  // In testing, with FFT size of 32, bucket #19 correspnds with metronome
  // ...but probably not your sound.
  for (i = 0; i < analysisArray.length; i++) {
    const magicBucket = analysisArray[i].freq;

    // Determine pulse if frequency threshold is exceeded.
    // -60 was determined empirically, you'll need to find your own threshold
    let hit = (freq[magicBucket] > trimGain);
    
    // An alternative approach is to check for a peak, regardless of freq
    // let hit = thresholdPeak(wave, 0.004);

    if (hit) {
      let pulsed = intervalMeter.pulse();

      if (pulsed) {
      
        //document.getElementById('hit').classList.add('hit');
        //document.getElementById("low").style.opacity = "1";

        analysisArray[i].action();
        
      } else {
        //document.getElementById('hit').classList.remove('hit');
        //document.getElementById("low").style.opacity = "0.1";
      
      }
    }
  }
  //Glass example
  let hitA = (freq[keyA] > keyGain);    //If amplitude of freq is higher than min
  let hitB = (freq[keyB] > keyGain);
  let hitC = (freq[keyC] > keyGain);

  //We only have two hands right ? :D 
  if (hitA && hitB) {
    let pulsed = intervalMeter.pulse();

    if (pulsed) {
      console.log('we have a winner')
      document.getElementById('lockText').innerHTML = "Unlocked";
      document.getElementById('lockText').style.color = 'green';
      document.getElementById('lockText').style.fontFamily = 'sans-serif';
      document.getElementById('lockText').style.fontStyle = 'italic';
      document.getElementById('lockText').style.fontSize = '40px';

    } else {
      //cool
    }
  } else {
    //no
  }

  //setTimeout(function () { 
  //  console.log(hitA, hitB, hitC);
  //}, 1000);


  // Optional rendering of data
  //visualiser.renderWave(wave, true);
  visualiser.renderFreq(freq);

  // Run again
  window.requestAnimationFrame(analyse);
};

function falling() {
  setTimeout(function() {
    ballon.y += 1;
    ballon.size -= 0.1;
    window.requestAnimationFrame(falling);
  }, 50);
}

//to start, call falling

function refresh() {
  location.reload();
}
