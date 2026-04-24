#!/usr/bin/env python3
"""
Pre-computation Script for Emotional Cartography
=================================================

This script processes your audio files and generates all static assets
needed for the web experience:

1. journey.json - Chapter metadata with feature summaries
2. clips/{clip-id}.json - Per-clip features and predictions
3. spectrograms/{clip-id}.png - Pre-rendered mel spectrograms
4. Waveform data (embedded in clip JSON)

Usage:
    python scripts/precompute.py --audio-dir /path/to/audio --output-dir public

Requirements:
    pip install librosa numpy matplotlib scikit-learn joblib
"""

import os
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any

import numpy as np
import librosa
import librosa.display
import matplotlib.pyplot as plt
from sklearn.cluster import AgglomerativeClustering
from sklearn.preprocessing import StandardScaler


def extract_features(y: np.ndarray, sr: int) -> Dict[str, Any]:
    """Extract audio features for a single clip."""
    
    # MFCC (13 coefficients, averaged over time)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_mean = mfcc.mean(axis=1).tolist()
    
    # Spectral features
    spectral_centroid = float(librosa.feature.spectral_centroid(y=y, sr=sr).mean())
    spectral_bandwidth = float(librosa.feature.spectral_bandwidth(y=y, sr=sr).mean())
    spectral_rolloff = float(librosa.feature.spectral_rolloff(y=y, sr=sr).mean())
    
    # Zero crossing rate
    zero_crossing_rate = float(librosa.feature.zero_crossing_rate(y).mean())
    
    # RMS Energy
    rms_energy = float(librosa.feature.rms(y=y).mean())
    
    # Tempo
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo = float(librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)[0])
    
    # Chroma features (for potential future use)
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    chroma_mean = chroma.mean(axis=1).tolist()
    
    return {
        "mfcc": mfcc_mean,
        "spectralCentroid": spectral_centroid,
        "spectralBandwidth": spectral_bandwidth,
        "spectralRolloff": spectral_rolloff,
        "zeroCrossingRate": zero_crossing_rate,
        "rmsEnergy": rms_energy,
        "tempo": tempo,
        "chromaStft": chroma_mean,
    }


def generate_waveform(y: np.ndarray, num_samples: int = 100) -> List[float]:
    """Downsample waveform to fixed number of points for visualization."""
    # Take absolute value and normalize
    waveform = np.abs(y)
    
    # Downsample using linear interpolation
    indices = np.linspace(0, len(waveform) - 1, num_samples)
    downsampled = np.interp(indices, np.arange(len(waveform)), waveform)
    
    # Normalize to 0-1 range
    if downsampled.max() > 0:
        downsampled = downsampled / downsampled.max()
    
    return downsampled.tolist()


def generate_spectrogram(y: np.ndarray, sr: int, output_path: Path, colormap: str = 'magma') -> None:
    """Generate and save mel spectrogram image."""
    # Compute mel spectrogram
    S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
    S_db = librosa.power_to_db(S, ref=np.max)
    
    # Create figure with transparent background
    fig, ax = plt.subplots(figsize=(10, 4))
    fig.patch.set_alpha(0)
    ax.set_facecolor('none')
    
    # Display spectrogram
    librosa.display.specshow(S_db, sr=sr, ax=ax, cmap=colormap, x_axis=None, y_axis=None)
    
    # Remove axes
    ax.axis('off')
    
    # Save with transparency
    plt.savefig(
        output_path,
        bbox_inches='tight',
        pad_inches=0,
        transparent=True,
        dpi=150
    )
    plt.close(fig)


def process_clip(audio_path: Path, output_dir: Path, sr: int = 22050) -> Dict[str, Any]:
    """Process a single audio clip and generate all assets."""
    clip_id = audio_path.stem
    
    print(f"  Processing: {clip_id}")
    
    # Load audio
    y, sr = librosa.load(audio_path, sr=sr)
    
    # Trim silence
    y_trimmed, _ = librosa.effects.trim(y, top_db=20)
    
    # Extract features
    features = extract_features(y_trimmed, sr)
    
    # Generate waveform data
    waveform = generate_waveform(y_trimmed)
    
    # Generate spectrogram
    spectrogram_dir = output_dir / "spectrograms"
    spectrogram_dir.mkdir(parents=True, exist_ok=True)
    spectrogram_path = spectrogram_dir / f"{clip_id}.png"
    generate_spectrogram(y_trimmed, sr, spectrogram_path)
    
    # Build clip data
    clip_data = {
        "id": clip_id,
        "filename": audio_path.name,
        "duration": float(librosa.get_duration(y=y_trimmed, sr=sr)),
        "waveform": waveform,
        "features": features,
        "spectrogramUrl": f"/spectrograms/{clip_id}.png",
        "predictions": {}  # Will be filled after clustering
    }
    
    return clip_data


def run_clustering(clips_data: List[Dict], n_clusters: int = 4) -> List[Dict]:
    """Run agglomerative clustering on all clips and add predictions."""
    print("\nRunning Agglomerative Clustering...")
    
    # Build feature matrix
    feature_matrix = []
    for clip in clips_data:
        features = clip["features"]
        # Create feature vector from relevant features
        vector = [
            features["spectralCentroid"] / 5000,  # Normalize
            features["spectralBandwidth"] / 3000,
            features["zeroCrossingRate"] * 10,
            features["rmsEnergy"] * 20,
            features["tempo"] / 200,
        ]
        # Add first 5 MFCCs (normalized)
        vector.extend([m / 100 for m in features["mfcc"][:5]])
        feature_matrix.append(vector)
    
    X = np.array(feature_matrix)
    
    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Run clustering
    clustering = AgglomerativeClustering(n_clusters=n_clusters, linkage='ward')
    labels = clustering.fit_predict(X_scaled)
    
    # Calculate confidence (silhouette-like score per sample)
    from sklearn.metrics import silhouette_samples
    silhouette_scores = silhouette_samples(X_scaled, labels)
    
    # Normalize silhouette scores to 0-1 confidence
    confidences = (silhouette_scores + 1) / 2
    
    # Add predictions to clips
    for i, clip in enumerate(clips_data):
        clip["predictions"] = {
            "agglomerative": {
                "cluster": int(labels[i]),
                "confidence": float(confidences[i])
            }
        }
    
    print(f"  Assigned {n_clusters} clusters")
    return clips_data


def main():
    parser = argparse.ArgumentParser(description="Pre-compute assets for Emotional Cartography")
    parser.add_argument("--audio-dir", required=True, help="Directory containing audio files")
    parser.add_argument("--output-dir", default="public", help="Output directory for assets")
    parser.add_argument("--n-clusters", type=int, default=4, help="Number of emotion clusters")
    parser.add_argument("--sample-rate", type=int, default=22050, help="Target sample rate")
    args = parser.parse_args()
    
    audio_dir = Path(args.audio_dir)
    output_dir = Path(args.output_dir)
    
    # Find all audio files
    audio_extensions = {'.wav', '.mp3', '.m4a', '.flac', '.ogg'}
    audio_files = [f for f in audio_dir.iterdir() if f.suffix.lower() in audio_extensions]
    
    if not audio_files:
        print(f"No audio files found in {audio_dir}")
        return
    
    print(f"Found {len(audio_files)} audio files")
    
    # Process all clips
    clips_data = []
    for audio_file in sorted(audio_files):
        clip_data = process_clip(audio_file, output_dir, sr=args.sample_rate)
        clips_data.append(clip_data)
    
    # Run clustering
    clips_data = run_clustering(clips_data, n_clusters=args.n_clusters)
    
    # Save individual clip JSON files
    clips_dir = output_dir / "data" / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)
    
    for clip in clips_data:
        clip_path = clips_dir / f"{clip['id']}.json"
        with open(clip_path, 'w') as f:
            json.dump(clip, f, indent=2)
    
    print(f"\nGenerated {len(clips_data)} clip JSON files")
    print(f"Generated {len(clips_data)} spectrogram images")
    print(f"\nAssets saved to: {output_dir}")
    print("\nNext steps:")
    print("  1. Update public/data/journey.json with your chapter metadata")
    print("  2. Map clips to chapters by adding clip IDs to audioClips arrays")
    print("  3. Add your personal narratives for each chapter")


if __name__ == "__main__":
    main()
