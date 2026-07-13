# -*- coding: utf-8 -*-
"""
YTDL Pro – Professional YouTube Video Downloader
PySide6 Desktop Application Suite
"""

import sys
import os
import uuid
from datetime import datetime
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QComboBox, QCheckBox, QProgressBar,
    QStackedWidget, QTableWidget, QTableWidgetItem, QTextEdit,
    QFileDialog, QListWidget, QListWidgetItem, QFrame, QScrollArea,
    QSizePolicy, QMessageBox, QHeaderView
)
from PySide6.QtCore import Qt, QSize, Signal, Slot
from PySide6.QtGui import QFont, QIcon, QColor, QPalette, QClipboard

# Import modular desktop subsystems
from core.config import ConfigManager
from database.db_manager import DBManager
from workers.info_worker import InfoWorker, PlaylistInfoWorker
from workers.download_worker import DownloadWorker


class SidebarWidget(QWidget):
    tab_changed = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("Sidebar")
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 25, 15, 25)
        layout.setSpacing(12)

        # App Brand Title
        brand_frame = QFrame()
        brand_layout = QVBoxLayout(brand_frame)
        brand_layout.setContentsMargins(0, 0, 0, 10)
        
        self.logo_lbl = QLabel("YTDL Pro")
        self.logo_lbl.setFont(QFont("Segoe UI", 16, QFont.Bold))
        self.logo_lbl.setStyleSheet("color: #F43F5E;")
        self.logo_lbl.setAlignment(Qt.AlignCenter)
        
        self.sub_lbl = QLabel("Professional Suite")
        self.sub_lbl.setFont(QFont("Segoe UI", 8))
        self.sub_lbl.setStyleSheet("color: #64748B;")
        self.sub_lbl.setAlignment(Qt.AlignCenter)
        
        brand_layout.addWidget(self.logo_lbl)
        brand_layout.addWidget(self.sub_lbl)
        layout.addWidget(brand_frame)

        # Nav buttons
        self.dash_btn = QPushButton(" Dashboard")
        self.history_btn = QPushButton(" History")
        self.companion_btn = QPushButton(" AI Companion")
        self.settings_btn = QPushButton(" Settings")

        self.buttons = {
            "dashboard": self.dash_btn,
            "history": self.history_btn,
            "companion": self.companion_btn,
            "settings": self.settings_btn
        }

        for tab_id, btn in self.buttons.items():
            btn.setFont(QFont("Segoe UI", 10, QFont.Medium))
            btn.setCheckable(True)
            btn.setFixedHeight(42)
            btn.setStyleSheet("""
                QPushButton {
                    text-align: left;
                    padding-left: 15px;
                    border: none;
                    border-radius: 8px;
                    color: #94A3B8;
                    background-color: transparent;
                }
                QPushButton:hover {
                    background-color: #1E293B;
                    color: #F8FAFC;
                }
                QPushButton:checked {
                    background-color: #0F172A;
                    color: #F43F5E;
                    border-left: 4px solid #F43F5E;
                }
            """)
            btn.clicked.connect(lambda checked, t=tab_id: self.on_button_clicked(t))
            layout.addWidget(btn)

        layout.addStretch()

        # Engine stats in footer
        footer_lbl = QLabel("Engine: yt-dlp\nUI: PySide6 (Qt)")
        footer_lbl.setFont(QFont("Consolas", 8))
        footer_lbl.setStyleSheet("color: #475569;")
        footer_lbl.setAlignment(Qt.AlignCenter)
        layout.addWidget(footer_lbl)

        self.dash_btn.setChecked(True)

    def on_button_clicked(self, tab_id):
        for t_id, btn in self.buttons.items():
            btn.setChecked(t_id == tab_id)
        self.tab_changed.emit(tab_id)


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("YTDL Pro – Professional Video Downloader")
        self.resize(1100, 750)

        # Subsystems
        self.config_manager = ConfigManager()
        self.db_manager = DBManager()

        self.current_video_metadata = None
        self.active_workers = {}

        self.init_ui()
        self.apply_theme()

    def apply_theme(self):
        # Global dark slate stylesheet
        self.setStyleSheet("""
            QMainWindow {
                background-color: #020617;
            }
            QWidget#Sidebar {
                background-color: #0B1329;
                border-right: 1px solid #1E293B;
            }
            QLabel {
                color: #E2E8F0;
            }
            QLineEdit {
                background-color: #090D16;
                border: 1px solid #1E293B;
                border-radius: 8px;
                padding: 10px;
                color: #F1F5F9;
                font-family: 'Segoe UI';
            }
            QLineEdit:focus {
                border: 1px solid #F43F5E;
            }
            QComboBox {
                background-color: #090D16;
                border: 1px solid #1E293B;
                border-radius: 8px;
                padding: 8px;
                color: #F1F5F9;
            }
            QComboBox:focus {
                border: 1px solid #F43F5E;
            }
            QCheckBox {
                color: #94A3B8;
                spacing: 8px;
            }
            QCheckBox::indicator {
                width: 16px;
                height: 16px;
                border: 1px solid #1E293B;
                border-radius: 4px;
                background-color: #090D16;
            }
            QCheckBox::indicator:checked {
                background-color: #F43F5E;
                border: 1px solid #F43F5E;
            }
            QProgressBar {
                border: 1px solid #1E293B;
                border-radius: 5px;
                background-color: #090D16;
                text-align: center;
                color: #F8FAFC;
                font-weight: bold;
            }
            QProgressBar::chunk {
                background-color: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #F43F5E, stop:1 #6366F1);
                border-radius: 4px;
            }
            QTableWidget {
                background-color: #090D16;
                border: 1px solid #1E293B;
                gridline-color: #1E293B;
                color: #E2E8F0;
                border-radius: 8px;
            }
            QHeaderView::section {
                background-color: #0B1329;
                color: #94A3B8;
                padding: 6px;
                border: 1px solid #1E293B;
                font-weight: bold;
            }
            QTextEdit {
                background-color: #090D16;
                border: 1px solid #1E293B;
                border-radius: 8px;
                color: #E2E8F0;
                padding: 10px;
            }
        """)

    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Left Sidebar
        self.sidebar = SidebarWidget()
        self.sidebar.tab_changed.connect(self.switch_tab)
        main_layout.addWidget(self.sidebar)

        # Right Stacked Widget Views
        self.stacked_widget = QStackedWidget()
        main_layout.addWidget(self.stacked_widget)

        # Create individual views
        self.init_dashboard_tab()
        self.init_history_tab()
        self.init_companion_tab()
        self.init_settings_tab()

    def switch_tab(self, tab_id):
        if tab_id == "dashboard":
            self.stacked_widget.setCurrentIndex(0)
        elif tab_id == "history":
            self.load_history_list()
            self.stacked_widget.setCurrentIndex(1)
        elif tab_id == "companion":
            self.stacked_widget.setCurrentIndex(2)
        elif tab_id == "settings":
            self.stacked_widget.setCurrentIndex(3)

    # ==================== DASHBOARD VIEW ====================
    def init_dashboard_tab(self):
        dash_widget = QWidget()
        layout = QVBoxLayout(dash_widget)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        # Header Title
        head_lbl = QLabel("Download Dashboard")
        head_lbl.setFont(QFont("Segoe UI", 18, QFont.Bold))
        layout.addWidget(head_lbl)

        # URL Input Row
        url_layout = QHBoxLayout()
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("Paste YouTube Video or Playlist link here...")
        
        self.paste_btn = QPushButton("Auto Paste")
        self.paste_btn.setFixedHeight(40)
        self.paste_btn.setStyleSheet("background-color: #1E293B; color: #F1F5F9; border-radius: 8px; padding: 0 15px;")
        self.paste_btn.clicked.connect(self.paste_from_clipboard)

        self.analyze_btn = QPushButton("Analyze URL")
        self.analyze_btn.setFixedHeight(40)
        self.analyze_btn.setStyleSheet("background-color: #F43F5E; color: white; font-weight: bold; border-radius: 8px; padding: 0 20px;")
        self.analyze_btn.clicked.connect(self.start_url_analysis)

        url_layout.addWidget(self.url_input)
        url_layout.addWidget(self.paste_btn)
        url_layout.addWidget(self.analyze_btn)
        layout.addLayout(url_layout)

        # Video metadata summary panel
        self.meta_frame = QFrame()
        self.meta_frame.setFrameShape(QFrame.StyledPanel)
        self.meta_frame.setStyleSheet("background-color: #0B1329; border: 1px solid #1E293B; border-radius: 12px; padding: 15px;")
        meta_layout = QHBoxLayout(self.meta_frame)
        
        self.meta_title_lbl = QLabel("Analyze a video to view details and format selections.")
        self.meta_title_lbl.setFont(QFont("Segoe UI", 10, QFont.Medium))
        self.meta_title_lbl.setWordWrap(True)
        meta_layout.addWidget(self.meta_title_lbl)
        
        layout.addWidget(self.meta_frame)

        # Selectors panel
        self.control_frame = QFrame()
        self.control_frame.setStyleSheet("background-color: #0B1329; border: 1px solid #1E293B; border-radius: 12px;")
        control_layout = QHBoxLayout(self.control_frame)
        control_layout.setContentsMargins(20, 15, 20, 15)

        # Download Mode
        mode_layout = QVBoxLayout()
        mode_layout.addWidget(QLabel("Download Mode"))
        self.mode_combo = QComboBox()
        self.mode_combo.addItems(["Video + Audio", "Audio Only", "Video Only"])
        self.mode_combo.currentIndexChanged.connect(self.on_mode_changed)
        mode_layout.addWidget(self.mode_combo)
        control_layout.addLayout(mode_layout)

        # File Format
        fmt_layout = QVBoxLayout()
        fmt_layout.addWidget(QLabel("Format"))
        self.format_combo = QComboBox()
        self.format_combo.addItems(["mp4", "mkv", "webm"])
        fmt_layout.addWidget(self.format_combo)
        control_layout.addLayout(fmt_layout)

        # Resolution Selection
        res_layout = QVBoxLayout()
        res_layout.addWidget(QLabel("Resolution"))
        self.res_combo = QComboBox()
        self.res_combo.addItems(["Best Quality", "1080p", "720p", "480p", "360p"])
        res_layout.addWidget(self.res_combo)
        control_layout.addLayout(res_layout)

        # Start Download Button
        self.download_btn = QPushButton("Download Now")
        self.download_btn.setFixedHeight(45)
        self.download_btn.setStyleSheet("background-color: #10B981; color: white; font-weight: bold; border-radius: 8px; padding: 0 25px;")
        self.download_btn.clicked.connect(self.start_download)
        control_layout.addWidget(self.download_btn)

        layout.addWidget(self.control_frame)

        # Active downloads manager list
        active_lbl = QLabel("Active Download Queue")
        active_lbl.setFont(QFont("Segoe UI", 12, QFont.Bold))
        layout.addWidget(active_lbl)

        self.queue_list = QListWidget()
        self.queue_list.setStyleSheet("background-color: #090D16; border: 1px solid #1E293B; border-radius: 8px;")
        layout.addWidget(self.queue_list)

        self.stacked_widget.addWidget(dash_widget)

    def paste_from_clipboard(self):
        clip = QApplication.clipboard().text()
        if clip:
            self.url_input.setText(clip)

    def start_url_analysis(self):
        url = self.url_input.text().strip()
        if not url:
            QMessageBox.warning(self, "Invalid URL", "Please paste or write a YouTube URL first!")
            return

        self.analyze_btn.setEnabled(False)
        self.analyze_btn.setText("Analyzing...")
        self.meta_title_lbl.setText("Extracting video metadata from YouTube, please wait...")

        is_playlist = "list=" in url or "playlist" in url
        if is_playlist:
            self.info_worker = PlaylistInfoWorker(url)
        else:
            self.info_worker = InfoWorker(url)

        self.info_worker.finished.connect(self.on_analysis_finished)
        self.info_worker.error.connect(self.on_analysis_failed)
        self.info_worker.start()

    def on_analysis_finished(self, metadata):
        self.analyze_btn.setEnabled(True)
        self.analyze_btn.setText("Analyze URL")
        self.current_video_metadata = metadata

        title = metadata.get("title", "Unknown Title")
        uploader = metadata.get("uploader", metadata.get("channel", "Unknown Channel"))
        duration = metadata.get("duration", 0)
        
        # Populate resolution combo dynamically from formats
        self.res_combo.clear()
        self.res_combo.addItem("Best Quality")
        
        heights = []
        formats = metadata.get("formats", [])
        for f in formats:
            h = f.get("height")
            if h and h not in heights:
                heights.append(h)
        heights.sort(reverse=True)
        for h in heights:
            self.res_combo.addItem(f"{h}p")

        info_text = f"Title: {title}\nChannel: {uploader}\nDuration: {duration // 60}m {duration % 60}s\n\nVideo is ready to download! Choose your configuration below."
        self.meta_title_lbl.setText(info_text)

    def on_analysis_failed(self, error_msg):
        self.analyze_btn.setEnabled(True)
        self.analyze_btn.setText("Analyze URL")
        self.meta_title_lbl.setText(f"Failed to analyze URL:\n{error_msg}")
        QMessageBox.critical(self, "Analysis Error", f"Error details:\n{error_msg}")

    def on_mode_changed(self, idx):
        self.format_combo.clear()
        if idx == 1:  # Audio Only
            self.format_combo.addItems(["mp3", "m4a", "aac", "wav", "opus"])
            self.res_combo.setEnabled(False)
        else:
            self.format_combo.addItems(["mp4", "mkv", "webm"])
            self.res_combo.setEnabled(True)

    def start_download(self):
        url = self.url_input.text().strip()
        if not url:
            QMessageBox.warning(self, "Error", "Analyze a URL first!")
            return

        download_id = str(uuid.uuid4())[:8]
        folder = self.config_manager.get("default_folder")
        download_type = "video" if self.mode_combo.currentIndex() == 0 else "audio" if self.mode_combo.currentIndex() == 1 else "video_only"
        resolution = self.res_combo.currentText()
        fmt_ext = self.format_combo.currentText()
        proxy = self.config_manager.get("proxy")

        title = self.current_video_metadata.get("title", "YouTube Video") if self.current_video_metadata else "YouTube Video"

        # Create row in Active Queue UI list widget
        item_widget = QWidget()
        item_layout = QVBoxLayout(item_widget)
        item_layout.setContentsMargins(10, 10, 10, 10)

        lbl = QLabel(f"{title} ({resolution} - {fmt_ext})")
        lbl.setFont(QFont("Segoe UI", 9, QFont.Bold))
        
        p_bar = QProgressBar()
        p_bar.setRange(0, 100)
        p_bar.setValue(0)

        stat_layout = QHBoxLayout()
        stat_lbl = QLabel("Connecting...")
        stat_lbl.setFont(QFont("Consolas", 8))
        stat_layout.addWidget(stat_lbl)
        
        cancel_btn = QPushButton("Cancel")
        cancel_btn.setStyleSheet("background-color: #E11D48; color: white; font-size: 10px; padding: 2px 8px; border-radius: 4px;")
        stat_layout.addWidget(cancel_btn)

        item_layout.addWidget(lbl)
        item_layout.addWidget(p_bar)
        item_layout.addLayout(stat_layout)

        list_item = QListWidgetItem(self.queue_list)
        list_item.setSizeHint(QSize(0, 80))
        self.queue_list.addItem(list_item)
        self.queue_list.setItemWidget(list_item, item_widget)

        # Create and run Download Thread
        worker = DownloadWorker(
            download_id, url, folder, download_type, resolution, fmt_ext,
            proxy=proxy
        )

        def update_progress(percent, size, speed, eta):
            p_bar.setValue(int(percent))
            stat_lbl.setText(f"{speed} | ETA: {eta} | Size: {size}")

        def download_finished(filepath):
            stat_lbl.setText("Completed successfully!")
            p_bar.setValue(100)
            cancel_btn.setEnabled(False)
            self.db_manager.add_record(
                download_id, url, title, datetime.now().strftime("%Y-%m-%d %H:%M"),
                folder, resolution, fmt_ext, "completed", p_bar.text()
            )

        def download_failed(err_msg):
            stat_lbl.setText(f"Failed: {err_msg}")
            p_bar.setValue(0)
            cancel_btn.setEnabled(False)
            self.db_manager.add_record(
                download_id, url, title, datetime.now().strftime("%Y-%m-%d %H:%M"),
                folder, resolution, fmt_ext, "failed", "0 B"
            )

        worker.progress.connect(update_progress)
        worker.completed.connect(download_finished)
        worker.failed.connect(download_failed)
        cancel_btn.clicked.connect(worker.cancel)

        worker.start()
        self.active_workers[download_id] = worker

    # ==================== HISTORY VIEW ====================
    def init_history_tab(self):
        history_widget = QWidget()
        layout = QVBoxLayout(history_widget)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        # Header Title
        head_lbl = QLabel("Download History")
        head_lbl.setFont(QFont("Segoe UI", 18, QFont.Bold))
        layout.addWidget(head_lbl)

        # Controls row
        ctrl_layout = QHBoxLayout()
        self.clear_hist_btn = QPushButton("Clear Database")
        self.clear_hist_btn.setStyleSheet("background-color: #E11D48; color: white; padding: 8px 15px; border-radius: 6px;")
        self.clear_hist_btn.clicked.connect(self.clear_history_db)
        ctrl_layout.addStretch()
        ctrl_layout.addWidget(self.clear_hist_btn)
        layout.addLayout(ctrl_layout)

        # History Table
        self.history_table = QTableWidget()
        self.history_table.setColumnCount(6)
        self.history_table.setHorizontalHeaderLabels(["Title", "Date", "Format", "Quality", "Status", "Size"])
        self.history_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        layout.addWidget(self.history_table)

        self.stacked_widget.addWidget(history_widget)

    def load_history_list(self):
        records = self.db_manager.get_all_records()
        self.history_table.setRowCount(len(records))
        for row_idx, r in enumerate(records):
            self.history_table.setItem(row_idx, 0, QTableWidgetItem(r["title"]))
            self.history_table.setItem(row_idx, 1, QTableWidgetItem(r["date"]))
            self.history_table.setItem(row_idx, 2, QTableWidgetItem(r["format"].upper()))
            self.history_table.setItem(row_idx, 3, QTableWidgetItem(r["quality"]))
            
            status_item = QTableWidgetItem(r["status"].upper())
            status_color = QColor("#10B981") if r["status"] == "completed" else QColor("#EF4444")
            status_item.setForeground(status_color)
            self.history_table.setItem(row_idx, 4, status_item)

            self.history_table.setItem(row_idx, 5, QTableWidgetItem(r["size"]))

    def clear_history_db(self):
        confirm = QMessageBox.question(self, "Clear History", "Are you sure you want to clear your local history database?")
        if confirm == QMessageBox.Yes:
            self.db_manager.clear_all()
            self.load_history_list()

    # ==================== AI COMPANION VIEW ====================
    def init_companion_tab(self):
        comp_widget = QWidget()
        layout = QVBoxLayout(comp_widget)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(15)

        # Header Title
        head_lbl = QLabel("AI Companion Chat")
        head_lbl.setFont(QFont("Segoe UI", 18, QFont.Bold))
        layout.addWidget(head_lbl)

        # Chat Text Box (Display)
        self.chat_display = QTextEdit()
        self.chat_display.setReadOnly(True)
        self.chat_display.setStyleSheet("background-color: #090D16; border: 1px solid #1E293B; color: #F1F5F9;")
        self.chat_display.setHtml("<b>System:</b> Hello! Ask any questions about YouTube downloads or video topics. Copy video links on the Dashboard to inject full metadata details.")
        layout.addWidget(self.chat_display)

        # Input box row
        inp_layout = QHBoxLayout()
        self.chat_input = QLineEdit()
        self.chat_input.setPlaceholderText("Ask a question about the video content or transcript...")
        self.chat_input.returnPressed.connect(self.send_chat_msg)
        
        self.send_btn = QPushButton("Send")
        self.send_btn.setFixedHeight(40)
        self.send_btn.setStyleSheet("background-color: #6366F1; color: white; border-radius: 8px; padding: 0 20px;")
        self.send_btn.clicked.connect(self.send_chat_msg)

        inp_layout.addWidget(self.chat_input)
        inp_layout.addWidget(self.send_btn)
        layout.addLayout(inp_layout)

        self.stacked_widget.addWidget(comp_widget)

    def send_chat_msg(self):
        msg = self.chat_input.text().strip()
        if not msg:
            return

        self.chat_display.append(f"<br><b>You:</b> {msg}")
        self.chat_input.clear()

        # Offline mockup response for standalone desktop when no key is present
        self.chat_display.append("<br><font color='#818CF8'><b>AI Companion:</b></font> I am running on local desktop. To converse directly with Gemini, please launch our Web App preview inside AI Studio, where Deep Thinking is fully integrated!")

    # ==================== SETTINGS VIEW ====================
    def init_settings_tab(self):
        settings_widget = QWidget()
        layout = QVBoxLayout(settings_widget)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        # Header Title
        head_lbl = QLabel("Settings Manager")
        head_lbl.setFont(QFont("Segoe UI", 18, QFont.Bold))
        layout.addWidget(head_lbl)

        # Folder settings
        folder_layout = QHBoxLayout()
        self.folder_input = QLineEdit()
        self.folder_input.setText(self.config_manager.get("default_folder"))
        self.browse_btn = QPushButton("Browse Folder")
        self.browse_btn.setStyleSheet("background-color: #1E293B; color: white; border-radius: 6px; padding: 10px 15px;")
        self.browse_btn.clicked.connect(self.browse_default_folder)
        folder_layout.addWidget(self.folder_input)
        folder_layout.addWidget(self.browse_btn)
        
        layout.addWidget(QLabel("Default Downloads Location"))
        layout.addLayout(folder_layout)

        # Proxy settings
        self.proxy_input = QLineEdit()
        self.proxy_input.setText(self.config_manager.get("proxy"))
        self.proxy_input.setPlaceholderText("e.g. http://127.0.0.1:8080")
        layout.addWidget(QLabel("Network Proxy Server URL (Optional)"))
        layout.addWidget(self.proxy_input)

        # Max simultaneous downloads selector
        self.max_threads_combo = QComboBox()
        self.max_threads_combo.addItems(["1 Task", "2 Tasks", "3 Tasks", "4 Tasks", "5 Tasks"])
        self.max_threads_combo.setCurrentIndex(self.config_manager.get("max_simultaneous_downloads") - 1)
        layout.addWidget(QLabel("Max Simultaneous Downloads Limit"))
        layout.addWidget(self.max_threads_combo)

        # Fallback toggles
        self.fallback_chk = QCheckBox("Smart Quality Fallback (Nearest Available)")
        self.fallback_chk.setChecked(self.config_manager.get("fallback_nearest"))
        layout.addWidget(self.fallback_chk)

        # Save settings button
        self.save_sett_btn = QPushButton("Save Settings")
        self.save_sett_btn.setFixedHeight(45)
        self.save_sett_btn.setStyleSheet("background-color: #F43F5E; color: white; font-weight: bold; border-radius: 8px;")
        self.save_sett_btn.clicked.connect(self.save_user_settings)
        layout.addWidget(self.save_sett_btn)

        layout.addStretch()
        self.stacked_widget.addWidget(settings_widget)

    def browse_default_folder(self):
        dir_path = QFileDialog.getExistingDirectory(self, "Select Download Folder", self.folder_input.text())
        if dir_path:
            self.folder_input.setText(dir_path)

    def save_user_settings(self):
        self.config_manager.set("default_folder", self.folder_input.text())
        self.config_manager.set("proxy", self.proxy_input.text().strip())
        self.config_manager.set("max_simultaneous_downloads", self.max_threads_combo.currentIndex() + 1)
        self.config_manager.set("fallback_nearest", self.fallback_chk.isChecked())
        QMessageBox.information(self, "Success", "Configuration successfully saved and applied!")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
