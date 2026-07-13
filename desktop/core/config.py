# -*- coding: utf-8 -*-
import os
import json

class ConfigManager:
    DEFAULT_CONFIG = {
        "theme": "dark",
        "default_quality": "1080p",
        "default_folder": os.path.expanduser("~/Downloads"),
        "proxy": "",
        "language": "en",
        "auto_update": False,
        "max_simultaneous_downloads": 3,
        "fallback_nearest": True
    }

    def __init__(self, config_path=None):
        if config_path is None:
            self.config_path = os.path.expanduser("~/.ytdl_pro_config.json")
        else:
            self.config_path = config_path
        self.config = self.load_config()

    def load_config(self):
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    return {**self.DEFAULT_CONFIG, **json.load(f)}
            except Exception:
                return self.DEFAULT_CONFIG.copy()
        return self.DEFAULT_CONFIG.copy()

    def save_config(self):
        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=4, ensure_ascii=False)
            return True
        except Exception:
            return False

    def get(self, key, default=None):
        return self.config.get(key, default)

    def set(self, key, value):
        self.config[key] = value
        self.save_config()
