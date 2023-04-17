// compare-tracks/app.mjs

import axios from "axios";
import Meyda from "meyda";
import { AudioContext } from "web-audio-api";

const audioContext = new AudioContext();
const BUFFER_SIZE_FRACTION = 200;
const NUMBER_OF_MFCC_COEFFICIENTS = 13;
const WINDOW_SLIDE_RATIO = 0.5;

const app = async (event) => {
  const bufferSizeFraction = event.bufferSizeFraction || BUFFER_SIZE_FRACTION;
  try {
    const { sourceTrack, targetTrack } = event
    console.log(event);
    console.log({ bufferSizeFraction });
    const sourceAudio = await downloadAudio(sourceTrack);
    const targetAudio = await downloadAudio(targetTrack);
    const sourceVector = await audioToVector(sourceAudio, bufferSizeFraction);
    const targetVector = await audioToVector(targetAudio, bufferSizeFraction);
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
    const dissimilarityScore = averageAbsoluteDifference(alignedSourceVector, targetVector);
    const similarityScore = 1 - dissimilarityScore;
    console.log(`score: ${similarityScore}`);
    return similarityScore;
  } catch (error) {
    console.error(`Error processing audio: ${error}`);
    throw error;
  }
}

const downloadAudio = async (url) => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return response.data;
  } catch (error) {
    console.error(`Error downloading audio: ${error}`);
    throw error;
  }
}

const averageAbsoluteDifference = (vector1, vector2) => {
  const sumOfAbsoluteDifferences = vector1.reduce((sum, a, i) => sum + Math.abs(a - vector2[i]), 0);
  return sumOfAbsoluteDifferences / vector1.length;
};

const audioToVector = async (audioData) => {
  try {
    const audioBuffer = await new Promise((resolve, reject) => {
      audioContext.decodeAudioData(audioData, resolve, reject);
    });
    console.log(audioBuffer.length);
    const bufferLength = audioBuffer.length;
    const channelDataArray = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channelDataArray.push(audioBuffer.getChannelData(i));
    }
    const bufferSizeFraction = Math.ceil(bufferLength / BUFFER_SIZE_FRACTION);
    const bufferSize = Math.pow(2, Math.floor(Math.log2(bufferSizeFraction)));
    const mfccArray = [];
    const startPosition = 0;
    const endPosition = bufferLength;
    const windowSize = Math.floor(bufferSize * WINDOW_SLIDE_RATIO);
    for (let i = startPosition; i < endPosition - bufferSize; i += windowSize) {
      const mfccArrayPerChannel = [];
      const chromaArrayPerChannel = [];
      for (const channelData of channelDataArray) {
        const bufferSegment = channelData.slice(i, i + bufferSize);
        const mfcc = Meyda.extract('mfcc', bufferSegment, {
          bufferSize: bufferSize,
          sampleRate: audioBuffer.sampleRate,
          numberOfMFCCCoefficients: NUMBER_OF_MFCC_COEFFICIENTS,
        });
        const chroma = Meyda.extract('chroma', bufferSegment, {
          bufferSize: bufferSize,
          sampleRate: audioBuffer.sampleRate,
        });
        const normalizedMfcc = normalizeArray(mfcc);
        const normalizedChroma = normalizeArray(chroma);
        mfccArrayPerChannel.push(normalizedMfcc);
        chromaArrayPerChannel.push(normalizedChroma);
      }
      const averagedMfcc = averageMfccAcrossChannels(mfccArrayPerChannel);
      const averagedChroma = averageMfccAcrossChannels(chromaArrayPerChannel);
      mfccArray.push(...averagedMfcc, ...averagedChroma);
    }
    return mfccArray;
  }
  catch (error) {
    console.error(`Error decoding audio: ${error}`);
    throw error;
  }
}

const normalizeArray = (array) => {
  const max = Math.max(...array);
  const min = Math.min(...array);
  const range = max - min;
  return array.map((value) => (value - min) / range);
}

const averageMfccAcrossChannels = (mfccArrayPerChannel) => {
  const numberOfChannels = mfccArrayPerChannel.length;
  const mfccLength = mfccArrayPerChannel[0].length;
  const averagedMfcc = Array(mfccLength).fill(0);
  for (const mfcc of mfccArrayPerChannel) {
    for (let i = 0; i < mfccLength; i++) {
      averagedMfcc[i] += mfcc[i] / numberOfChannels;
    }
  }
  return averagedMfcc;
}

const cosineSimilarity = (vector1, vector2) => {
  const dotProduct = vector1.reduce((sum, a, i) => sum + a * vector2[i], 0);
  const normVector1 = Math.sqrt(vector1.reduce((sum, a) => sum + a * a, 0));
  const normVector2 = Math.sqrt(vector2.reduce((sum, a) => sum + a * a, 0));
  if (normVector1 === 0 || normVector2 === 0) {
    return 0;
  }
  const similarity = dotProduct / (normVector1 * normVector2);
  const rescaledSimilarity = (similarity + 1) / 2; // Rescale cosine similarity from [-1, 1] to [0, 1]
  return rescaledSimilarity;
}

export { app };




