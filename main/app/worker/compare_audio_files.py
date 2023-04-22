import tensorflow as tf
import librosa
import requests
import numpy as np
import librosa.display
from io import BytesIO
from dotenv import load_dotenv
from scipy.spatial.distance import cosine
from sklearn.preprocessing import StandardScaler
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
    min_len = min(source_audio.shape[0], target_audio.shape[0])
    source_audio = source_audio[:min_len]
    target_audio = target_audio[:min_len]

    source_features = extract_audio_features(source_audio, target_sr)
    target_features = extract_audio_features(target_audio, target_sr)
    source_features_norm = normalize_audio_features(source_features)
    target_features_norm = normalize_audio_features(target_features)
    similarity = 1 - cosine(source_features_norm.T.flatten(),
                            target_features_norm.T.flatten())
    return similarity * 100


def load_audio_file(url):
    response = requests.get(url)
    return BytesIO(response.content)


def extract_audio_features(audio, sr):
    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=20)
    chroma = librosa.feature.chroma_stft(y=audio, sr=sr)
    spectral_contrast = librosa.feature.spectral_contrast(y=audio, sr=sr)
    tonnetz = librosa.feature.tonnetz(y=librosa.effects.harmonic(audio), sr=sr)
    return np.concatenate((mfcc, chroma, spectral_contrast, tonnetz))


def normalize_audio_features(features):
    scaler = StandardScaler()
    return scaler.fit_transform(features)
