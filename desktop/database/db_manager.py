# -*- coding: utf-8 -*-
import sqlite3
import os

class DBManager:
    def __init__(self, db_path=None):
        if db_path is None:
            self.db_path = os.path.expanduser("~/.ytdl_pro_history.db")
        else:
            self.db_path = db_path
        self.init_db()

    def init_db(self):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS download_history (
                    id TEXT PRIMARY KEY,
                    url TEXT NOT NULL,
                    title TEXT NOT NULL,
                    date TEXT NOT NULL,
                    folder TEXT NOT NULL,
                    quality TEXT NOT NULL,
                    format TEXT NOT NULL,
                    status TEXT NOT NULL,
                    size TEXT NOT NULL
                )
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Failed to initialize SQLite database: {e}")

    def add_record(self, record_id, url, title, date, folder, quality, file_format, status, size):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO download_history 
                (id, url, title, date, folder, quality, format, status, size) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (record_id, url, title, date, folder, quality, file_format, status, size))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Failed to insert record: {e}")
            return False

    def get_all_records(self):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT id, url, title, date, folder, quality, format, status, size FROM download_history ORDER BY rowid DESC")
            rows = cursor.fetchall()
            conn.close()
            
            records = []
            for row in rows:
                records.append({
                    "id": row[0],
                    "url": row[1],
                    "title": row[2],
                    "date": row[3],
                    "folder": row[4],
                    "quality": row[5],
                    "format": row[6],
                    "status": row[7],
                    "size": row[8]
                })
            return records
        except Exception as e:
            print(f"Failed to retrieve history: {e}")
            return []

    def clear_all(self):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM download_history")
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Failed to clear history: {e}")
            return False
