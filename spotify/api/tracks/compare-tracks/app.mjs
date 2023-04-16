import axios from "axios";
import Meyda from "meyda";
import { AudioContext } from "web-audio-api";
const audioContext = new AudioContext();

async function downloadAudio(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return response.data;
}

async function audioToVector(audioData, isTarget = false) {
  const audioBuffer = await new Promise((resolve, reject) => {
    audioContext.decodeAudioData(audioData, resolve, reject);
  });
  const bufferLength = audioBuffer.length;
  const channelData = audioBuffer.getChannelData(0);
  const bufferSizeFraction = Math.ceil(bufferLength / 200);
  const bufferSize = Math.pow(2, Math.floor(Math.log2(bufferSizeFraction)));
  const numberOfMFCCCoefficients = 6;
  const mfccArray = [];
  const startPosition = isTarget ? Math.floor(bufferLength * 0.1) : 0;
  const endPosition = isTarget ? Math.floor(bufferLength * 0.9) : bufferLength;
  for (let i = startPosition; i < endPosition - bufferSize; i += bufferSize) {
    const bufferSegment = channelData.slice(i, i + bufferSize);
    const mfcc = Meyda.extract('mfcc', bufferSegment, {
      bufferSize: bufferSize,
      sampleRate: audioBuffer.sampleRate,
      numberOfMFCCCoefficients: numberOfMFCCCoefficients,
    });
    mfccArray.push(...mfcc);
  }
  return mfccArray;
}

async function app(event) {
  const { sourceTrack, targetTrack } = event
  const sourceAudio = await downloadAudio(sourceTrack);
  const targetAudio = await downloadAudio(targetTrack);
  const sourceVector = await audioToVector(sourceAudio);
  const targetVector = await audioToVector(targetAudio, true);
  const similarityScore = cosineSimilarity(sourceVector, targetVector);
  console.log(`score: ${similarityScore}`);
  console.log({ sourceTrack, targetTrack });
  return similarityScore
}

function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
  const normVec1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
  const normVec2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
  return dotProduct / (normVec1 * normVec2);
}

export { app };
