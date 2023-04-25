import librosa
import requests
import numpy as np
import librosa.display
import librosa.segment
from io import BytesIO
from dotenv import load_dotenv
from scipy.spatial.distance import cosine
from sklearn.preprocessing import StandardScaler
from fastdtw import fastdtw
load_dotenv()


def compare_audio_files(source_track_url, target_track_url):
    source_audio_data = load_audio_file(source_track_url)
    target_audio_data = load_audio_file(target_track_url)
    source_audio, source_sr = librosa.load(
        source_audio_data, sr=None, mono=True)
    target_audio, target_sr = librosa.load(
        target_audio_data, sr=None, mono=True)
    if source_sr != target_sr:
        target_sr = max(source_sr, target_sr)
        source_audio = librosa.resample(source_audio, source_sr, target_sr)
        target_audio = librosa.resample(target_audio, target_sr, target_sr)

    source_features = extract_audio_features(source_audio, target_sr)
    target_features = extract_audio_features(target_audio, target_sr)

    # Find the best alignment using the Smith-Waterman algorithm
    distance, path = fastdtw(source_features.T, target_features.T)
    aligned_source_features = source_features[:, [x[0] for x in path]]
    aligned_target_features = target_features[:, [x[1] for x in path]]

    # Normalize the features
    aligned_source_features_norm = normalize_audio_features(
        aligned_source_features)
    aligned_target_features_norm = normalize_audio_features(
        aligned_target_features)

    # Compute the similarity score
    similarity = 1 - cosine(aligned_source_features_norm.T.flatten(),
                            aligned_target_features_norm.T.flatten())
    return similarity * 100


def load_audio_file(url):
    response = requests.get(url)
    return BytesIO(response.content)


def extract_audio_features(audio, sr):
    cqt = librosa.cqt(audio, sr=sr)
    cqt_magnitude = np.abs(cqt)  # Use the magnitude of the CQT
    cens = librosa.feature.chroma_cens(C=cqt_magnitude, sr=sr)
    mfcc = librosa.feature.mfcc(y=audio, sr=sr)
    spectral_contrast = librosa.feature.spectral_contrast(y=audio, sr=sr)
    spectral_centroid = librosa.feature.spectral_centroid(y=audio, sr=sr)

    # Combine features
    features = np.vstack((cens, mfcc, spectral_contrast, spectral_centroid))
    return features


def normalize_audio_features(features):
    scaler = StandardScaler()
    return scaler.fit_transform(features)
