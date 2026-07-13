# -*- coding: utf-8 -*-
from PySide6.QtCore import QThread, Signal
import json
import subprocess

class InfoWorker(QThread):
    finished = Signal(dict)
    error = Signal(str)

    def __init__(self, url):
        super().__init__()
        self.url = url

    def run(self):
        try:
            # Run yt-dlp to extract json info without loading the playlist
            process = subprocess.Popen(
                ["yt-dlp", "--dump-json", "--no-playlist", self.url],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            stdout, stderr = process.communicate()

            if process.returncode != 0:
                err_msg = stderr.strip() or "Failed to load video info."
                if "Private video" in err_msg:
                    err_msg = "This video is private."
                elif "Sign in to confirm your age" in err_msg:
                    err_msg = "This video is age-restricted."
                self.error.emit(err_msg)
                return

            metadata = json.loads(stdout)
            self.finished.emit(metadata)
        except Exception as e:
            self.error.emit(str(e))
Class PlaylistInfoWorker(QThread):
    finished = Signal(dict)
    error = Signal(str)

    def __init__(self, url):
        super().__init__()
        self.url = url

    def run(self):
        try:
            # Flat-playlist parses list items extremely fast
            process = subprocess.Popen(
                ["yt-dlp", "--flat-playlist", "--dump-json", self.url],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            stdout, stderr = process.communicate()

            if process.returncode != 0:
                self.error.emit(stderr.strip() or "Failed to load playlist info.")
                return

            lines = stdout.strip().split("\n")
            if not lines or not lines[0]:
                self.error.emit("No playlist items found.")
                return

            entries = [json.loads(line) for line in lines if line.strip()]
            self.finished.emit({"entries": entries})
        except Exception as e:
            self.error.emit(str(e))
