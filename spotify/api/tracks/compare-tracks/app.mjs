// compare-tracks/app.mjs

import axios from "axios";
import Meyda from "meyda";
import { AudioContext } from "web-audio-api";

const audioContext = new AudioContext();
const BUFFER_SIZE_FRACTION = 100;
const NUMBER_OF_MFCC_COEFFICIENTS = 13;
const WINDOW_SLIDE_RATIO = 0.5;

const downloadAudio = async (url) => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return response.data;
  } catch (error) {
    console.error(`Error downloading audio: ${error}`);
    throw error;
  }
}

const audioToVector = async (audioData) => {
  try {
    const audioBuffer = await new Promise((resolve, reject) => {
      audioContext.decodeAudioData(audioData, resolve, reject);
    });
    const bufferLength = audioBuffer.length;
    const channelData = audioBuffer.getChannelData(0);
    const bufferSizeFraction = Math.ceil(bufferLength / BUFFER_SIZE_FRACTION);
    const bufferSize = Math.pow(2, Math.floor(Math.log2(bufferSizeFraction)));
    const mfccArray = [];
    const startPosition = 0;
    const endPosition = bufferLength;
    const windowSize = Math.floor(bufferSize * WINDOW_SLIDE_RATIO);
    for (let i = startPosition; i < endPosition - bufferSize; i += windowSize) {
      const bufferSegment = channelData.slice(i, i + bufferSize);
      const mfcc = Meyda.extract('mfcc', bufferSegment, {
        bufferSize: bufferSize,
        sampleRate: audioBuffer.sampleRate,
        numberOfMFCCCoefficients: NUMBER_OF_MFCC_COEFFICIENTS,
      });
      mfccArray.push(...mfcc);
    }
    return mfccArray;
  }
  catch (error) {
    console.error(`Error decoding audio: ${error}`);
    throw error;
  }
}

const app = async (event) => {
  try {
    const { sourceTrack, targetTrack } = event
    console.log(event);;
    const sourceAudio = await downloadAudio(sourceTrack);
    const targetAudio = await downloadAudio(targetTrack);
    const sourceVector = await audioToVector(sourceAudio);
    const targetVector = await audioToVector(targetAudio);
    let maxSimilarity = -Infinity;
    let maxIndex = 0;
    for (let i = 0; i < sourceVector.length - targetVector.length; i++) {
      const similarity = cosineSimilarity(
        sourceVector.slice(i, i + targetVector.length),
        targetVector
      );
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        maxIndex = i;
      }
    }
    const alignedSourceVector = sourceVector.slice(maxIndex, maxIndex + targetVector.length);
    const similarityScore = cosineSimilarity(alignedSourceVector, targetVector);
    console.log(`score: ${similarityScore}`);
    return similarityScore;
  } catch (error) {
    console.error(`Error processing audio: ${error}`);
    throw error;
  }
}

const cosineSimilarity = (vector1, vector2) => {
  const dotProduct = vector1.reduce((sum, a, i) => sum + a * vector2[i], 0);
  const normVector1 = Math.sqrt(vector1.reduce((sum, a) => sum + a * a, 0));
  const normVector2 = Math.sqrt(vector2.reduce((sum, a) => sum + a * a, 0));
  if (normVector1 === 0 || normVector2 === 0) {
    return 0;
  }
  return dotProduct / (normVector1 * normVector2);
}

export { app };




