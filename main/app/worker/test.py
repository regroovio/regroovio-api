import os
import numpy as np
import librosa


def load_audio(file_path):
    y, sr = librosa.load(file_path, sr=None)
    return y, sr


def generate_fingerprint(y, sr):
    mfcc = librosa.feature.mfcc(y=y, sr=sr)
    return mfcc


def compare_fingerprints(f1, f2):
    similarity = np.dot(f1.T, f2) / (np.linalg.norm(f1) * np.linalg.norm(f2))
    return np.mean(similarity)


def is_preview_similar(preview_path, original_path, threshold=0.6):
    preview_y, preview_sr = load_audio(preview_path)
    original_y, original_sr = load_audio(original_path)

    preview_fingerprint = generate_fingerprint(preview_y, preview_sr)
    original_fingerprint = generate_fingerprint(original_y, original_sr)

    similarity = compare_fingerprints(
        preview_fingerprint, original_fingerprint)
    return similarity > threshold


if __name__ == '__main__':
    data_dir = 'data'

    original_files = [f for f in os.listdir(
        data_dir) if not '-preview' in f and f.endswith('.mp3')]
    preview_files = [f for f in os.listdir(
        data_dir) if '-preview' in f and f.endswith('.mp3')]

    for original_file, preview_file in zip(sorted(original_files), sorted(preview_files)):
        original_path = os.path.join(data_dir, original_file)
        preview_path = os.path.join(data_dir, preview_file)

        if is_preview_similar(preview_path, original_path):
            print(f'{preview_file} is similar to {original_file}')
        else:
            print(f'{preview_file} is not similar to {original_file}')
