import requests
import numpy as np
import librosa
from scipy.spatial.distance import cosine
from sklearn.preprocessing import StandardScaler


def extract_audio_features(audio_data):
    audio, sr = librosa.load(audio_data, sr=None, mono=True)
    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=20)
    chroma = librosa.feature.chroma_stft(y=audio, sr=sr)
    spectral_contrast = librosa.feature.spectral_contrast(y=audio, sr=sr)
    mel_spectrogram = librosa.feature.melspectrogram(y=audio, sr=sr)

    return {"mfcc": mfcc, "chroma": chroma, "spectral_contrast": spectral_contrast, "mel_spectrogram": mel_spectrogram}


def best_song_detection(track1, track2, parameters):
    features1 = extract_audio_features(track1)
    features2 = extract_audio_features(track2)

    normalized_features1 = normalize_audio_features(features1)
    normalized_features2 = normalize_audio_features(features2)

    weighted_similarity = 0

    for feature, weight in parameters.items():
        feature1_padded, feature2_padded = pad_features(
            normalized_features1[feature], normalized_features2[feature])
        similarity = 1 - cosine(feature1_padded.flatten(),
                                feature2_padded.flatten())
        weighted_similarity += weight * similarity

    return weighted_similarity


def normalize_audio_features(features):
    normalized_features = {}
    scaler = StandardScaler()
    for feature_name, feature_data in features.items():
        normalized_features[feature_name] = scaler.fit_transform(
            feature_data.T).T
    return normalized_features


def pad_features(feature1, feature2):
    max_shape = tuple(np.maximum(feature1.shape, feature2.shape))
    padded_feature1 = np.zeros(max_shape)
    padded_feature2 = np.zeros(max_shape)
    padded_feature1[:feature1.shape[0], :feature1.shape[1]] = feature1
    padded_feature2[:feature2.shape[0], :feature2.shape[1]] = feature2
    return padded_feature1, padded_feature2


def extract_segment_features(normalized_features, start_time, segment_length):
    segment_features = {}
    for feature_name, feature_data in normalized_features.items():
        frame_start = librosa.time_to_frames(start_time, hop_length=512)
        frame_length = librosa.time_to_frames(segment_length, hop_length=512)
        segment_features[feature_name] = feature_data[:,
                                                      frame_start:frame_start+frame_length]
    return segment_features


def calculate_weighted_similarity(normalized_features1, normalized_features2, parameters):
    weighted_similarity = 0

    for feature, weight in parameters.items():
        feature1_padded, feature2_padded = pad_features(
            normalized_features1[feature], normalized_features2[feature])
        similarity = 1 - cosine(feature1_padded.flatten(),
                                feature2_padded.flatten())
        weighted_similarity += weight * similarity

    return weighted_similarity


# Usage example
track1 = "./Done With the Day.mp3"
track2 = "./Done With the Day.mp3"

parameters = {
    "mfcc": 0.25,
    "chroma": 0.25,
    "spectral_contrast": 0.25,
    "mel_spectrogram": 0.25,
}

similarity = best_song_detection(track1, track2, parameters)
print(f"Similarity: {similarity:.2f}")
