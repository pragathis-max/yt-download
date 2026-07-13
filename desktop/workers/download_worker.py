# -*- coding: utf-8 -*-
import re
import os
import subprocess
from PySide6.QtCore import QThread, Signal

class DownloadWorker(QThread):
    progress = Signal(float, str, str, str)  # percentage, size, speed, eta
    completed = Signal(str)  # filepath
    failed = Signal(str)  # error details
    status_changed = Signal(str)  # e.g. "Merging formats...", "Finished"

    def __init__(self, download_id, url, folder, download_type, resolution, format_ext, subtitle="none", proxy="", embed_metadata=True, embed_thumbnail=True):
        super().__init__()
        self.download_id = download_id
        self.url = url
        self.folder = folder
        self.download_type = download_type
        self.resolution = resolution
        self.format_ext = format_ext
        self.subtitle = subtitle
        self.proxy = proxy
        self.embed_metadata = embed_metadata
        self.embed_thumbnail = embed_thumbnail
        
        self.process = None
        self._is_cancelled = False
        self._is_paused = False

    def run(self):
        try:
            args = ["yt-dlp", "--newline", "--progress"]

            # Setup format selectors
            if self.download_type == "audio":
                args.extend(["-f", "bestaudio/best", "-x", "--audio-format", self.format_ext])
            elif self.download_type == "video_only":
                height = self.resolution.replace("p", "")
                if height == "best":
                    args.extend(["-f", "bestvideo"])
                else:
                    args.extend(["-f", f"bestvideo[height<={height}]/bestvideo"])
                args.extend(["--merge-output-format", self.format_ext])
            else:  # video (combined video + audio)
                height = self.resolution.replace("p", "")
                if height == "best":
                    args.extend(["-f", "bestvideo+bestaudio/best"])
                else:
                    args.extend(["-f", f"bestvideo[height<={height}]+bestaudio/best"])
                args.extend(["--merge-output-format", self.format_ext])

            if self.embed_metadata:
                args.append("--embed-metadata")
            if self.embed_thumbnail:
                args.append("--embed-thumbnail")

            # Setup subtitles
            if self.subtitle != "none":
                lang = self.subtitle.replace(" (auto)", "")
                if " (auto)" in self.subtitle:
                    args.append("--write-auto-subs")
                else:
                    args.append("--write-subs")
                args.extend(["--sub-langs", lang])

            # Output naming template
            output_template = os.path.join(self.folder, f"%(title)s-{self.download_id}.%(ext)s")
            args.extend(["-o", output_template])

            if self.proxy:
                args.extend(["--proxy", self.proxy])

            args.append(self.url)

            # Start child process
            self.process = subprocess.Popen(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                encoding="utf-8",
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )

            # Read stdout line by line
            while self.process.poll() is None:
                if self._is_cancelled:
                    self.process.kill()
                    self.failed.emit("Cancelled by user.")
                    return

                # If paused, wait (we use simple polling or let thread sleep briefly)
                if self._is_paused:
                    self.msleep(200)
                    continue

                line = self.process.stdout.readline()
                if not line:
                    continue

                line = line.strip()

                if "[Merger]" in line or "Merging formats" in line:
                    self.status_changed.emit("Merging video & audio...")
                    self.progress.emit(98.0, "Calculating...", "Merging...", "Finishing...")
                    continue

                if "[ExtractAudio]" in line or "Extracting audio" in line:
                    self.status_changed.emit("Extracting audio track...")
                    self.progress.emit(99.0, "Calculating...", "Extracting...", "Finishing...")
                    continue

                if "[download]" in line:
                    percent_match = re.search(r"([\d\.]+)%", line)
                    size_match = re.search(r"of\s+([0-9\.]+[a-zA-Z]+)", line)
                    speed_match = re.search(r"at\s+([0-9\.]+[a-zA-Z]+/s)", line)
                    eta_match = re.search(r"ETA\s+([\d:]+)", line)

                    percent = float(percent_match.group(1)) if percent_match else 0.0
                    size = size_match.group(1) if size_match else "Calculating..."
                    speed = speed_match.group(1) if speed_match else "0 B/s"
                    eta = eta_match.group(1) if eta_match else "--:--"

                    if "has already been downloaded" in line:
                        percent = 100.0
                        speed = "Already downloaded"
                        eta = "Completed"

                    self.progress.emit(percent, size, speed, eta)

            # Final check of return code
            returncode = self.process.poll()
            if returncode == 0:
                # Find output filename
                final_file = "Unknown file"
                try:
                    for f in os.listdir(self.folder):
                        if f"-{self.download_id}." in f:
                            final_file = os.path.join(self.folder, f)
                            break
                except Exception:
                    pass
                self.completed.emit(final_file)
            else:
                if not self._is_cancelled:
                    stderr_content = self.process.stderr.read()
                    self.failed.emit(stderr_content or f"Process exited with code {returncode}")
        except Exception as e:
            self.failed.emit(str(e))

    def pause(self):
        self._is_paused = True
        self.status_changed.emit("Paused")

    def resume(self):
        self._is_paused = False
        self.status_changed.emit("Downloading")

    def cancel(self):
        self._is_cancelled = True
        if self.process:
            try:
                self.process.kill()
            except Exception:
                pass
