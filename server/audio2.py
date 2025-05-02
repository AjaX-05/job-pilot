import os
import pyaudio
import wave
import tempfile
import pygame
import webrtcvad
import collections
import time
import threading
import audioop
from deepgram import DeepgramClient

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
deepgram = DeepgramClient(DEEPGRAM_API_KEY)
filename = "server/test.mp3"

playback_lock = threading.Lock()
stop_requested_by_main = False

def request_stop():
    global stop_requested_by_main
    stop_requested_by_main = True

def speak(text):
    try:
        with playback_lock:
            # Use text-to-speech API to generate audio
            response = deepgram.speak.v("1").stream(text, voice="nova")
            audio_data = response.read()
            
            # Save the audio response to a file
            with open(filename, "wb") as f:
                f.write(audio_data)
                
            print("[INFO] Speech saved as", filename)
            play_mp3(filename)
    except Exception as e:
        print(f"[ERROR] Speak Exception: {e}")

def play_mp3(file_path):
    try:
        pygame.mixer.quit()
        pygame.init()
        pygame.mixer.init()
        pygame.mixer.music.load(file_path)
        pygame.mixer.music.play()
        print("[INFO] Playing MP3...")
        while pygame.mixer.music.get_busy():
            if stop_requested_by_main:
                print("[STOP] Playback interrupted by stop request.")
                pygame.mixer.music.stop()
                break
            pygame.time.wait(100)
        print("[INFO] Audio playback complete.")
        pygame.mixer.music.stop()
        pygame.mixer.quit()
    except Exception as e:
        print(f"[ERROR] MP3 Playback Error: {e}")

def record_until_silence(sample_rate=16000, frame_duration_ms=30, silence_timeout=1.5):
    vad = webrtcvad.Vad(3)
    frame_samples = int(sample_rate * frame_duration_ms / 1000)
    frame_size = frame_samples * 2
    max_silence_frames = int(silence_timeout * 1000 / frame_duration_ms)
    pre_speech_buffer = collections.deque(maxlen=10)
    silence_counter = 0
    debounce_frames = int(0.3 * 1000 / frame_duration_ms)
    speech_frames_required = int(0.2 * 1000 / frame_duration_ms)
    continuous_speech_frames = 0
    MIN_VOLUME = 800
    MIN_TOTAL_FRAMES = 20

    audio = pyaudio.PyAudio()
    stream = audio.open(format=pyaudio.paInt16,
                        channels=1,
                        rate=sample_rate,
                        input=True,
                        frames_per_buffer=frame_samples)
    print("[INFO] Listening for speech...")
    frames = []
    triggered = False
    last_speech_time = time.time()

    try:
        while not stop_requested_by_main:
            frame = stream.read(frame_samples, exception_on_overflow=False)
            if len(frame) != frame_size:
                print("[WARN] Incomplete frame: expected", frame_size, "got", len(frame))
                continue
            volume = audioop.rms(frame, 2)
            is_speech = volume >= MIN_VOLUME and vad.is_speech(frame, sample_rate)
            current_time = time.time()
            if is_speech:
                continuous_speech_frames += 1
                last_speech_time = current_time
            else:
                continuous_speech_frames = 0
            if not triggered and continuous_speech_frames >= speech_frames_required:
                print("[INFO] Detected start of speech")
                triggered = True
                frames.extend(pre_speech_buffer)
                pre_speech_buffer.clear()
                frames.append(frame)
            elif not triggered:
                pre_speech_buffer.append(frame)
            elif triggered:
                frames.append(frame)
                if is_speech:
                    silence_counter = 0
                else:
                    if current_time - last_speech_time > 0.3:
                        silence_counter += 1
                        if silence_counter > max_silence_frames:
                            print("[INFO] Long silence detected. Stopping...")
                            break
            time.sleep(0.001)
    finally:
        stream.stop_stream()
        stream.close()
        audio.terminate()
    if len(frames) < MIN_TOTAL_FRAMES:
        print("[WARN] Not enough speech detected. Ignored.\n")
        return ""
    temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    with wave.open(temp_wav.name, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(audio.get_sample_size(pyaudio.paInt16))
        wf.setframerate(sample_rate)
        wf.writeframes(b''.join(frames))
    print("[INFO] Audio saved to:", temp_wav.name)
    return temp_wav.name

def transcribe_audio(file_path):
    try:
        with open(file_path, "rb") as audio_file:
            buffer_data = audio_file.read()
            
        response = deepgram.listen.prerecorded.v("1").transcribe_file({"buffer": buffer_data})
        transcript = response["results"]["channels"][0]["alternatives"][0]["transcript"]
        return transcript
    except Exception as e:
        print(f"[ERROR] Deepgram Exception: {e}")
        return ""

def listen():
    while playback_lock.locked():
        print("[WAIT] Waiting for playback to finish before listening...")
        time.sleep(0.5)
    time.sleep(0.5)
    audio_file = record_until_silence()
    if audio_file:
        return transcribe_audio(audio_file)
    return ""