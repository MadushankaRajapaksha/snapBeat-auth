import os
import sqlite3
import bcrypt
import threading # Added threading for lock

class Database:
    def __init__(self):
        self.user_table_create_query = """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password BLOB NOT NULL
        );
        """
        self.lock = threading.Lock() # Initialize lock

        # Use writable path on Vercel
        tmp_dir = "/tmp"
        os.makedirs(tmp_dir, exist_ok=True)
        self.db_path = os.path.join(tmp_dir, "database.db")

        self.init_db()

    def init_db(self):
        with self.get_db_connection() as con:
            cur = con.cursor()
            cur.execute(self.user_table_create_query)
            con.commit()

    def get_db_connection(self):
        return sqlite3.connect(self.db_path, check_same_thread=False)

    def add_user(self, username, email, hashed_password):
        with self.lock:
            with self.get_db_connection() as con:
                cur = con.cursor()
                try:
                    cur.execute("INSERT INTO users(username, email, password) VALUES(?,?,?)", (username, email, hashed_password))
                    con.commit()
                    cur.execute("SELECT * FROM users WHERE username=?", (username,))
                    user = cur.fetchone()
                    return user
                except sqlite3.IntegrityError:
                    return None # User already exists (due to UNIQUE constraint)

    def get_user_by_id(self, id):
        with self.get_db_connection() as con:
            cur = con.cursor()
            cur.execute("SELECT * FROM users WHERE id=?", (id,))
            user = cur.fetchone()
            return user

    def update_user_password(self, user_id, hashed_password):
        with self.lock:
            with self.get_db_connection() as con:
                cur = con.cursor()
                try:
                    cur.execute("UPDATE users SET password=? WHERE id=?", (hashed_password, user_id))
                    con.commit()
                    return True
                except sqlite3.Error as e:
                    print(f"Database error: {e}")
                    return False

    def update_user_with_password(self, user_id, username, email, hashed_password):
        with self.lock:
            with self.get_db_connection() as con:
                cur = con.cursor()
                try:
                    cur.execute("UPDATE users SET username=?, email=?, password=? WHERE id=?", (username, email, hashed_password, user_id))
                    con.commit()
                    return True
                except sqlite3.Error as e:
                    print(f"Database error: {e}")
                    return False

    def update_user_without_password(self, user_id, username, email):
        with self.lock:
            with self.get_db_connection() as con:
                cur = con.cursor()
                try:
                    cur.execute("UPDATE users SET username=?, email=? WHERE id=?", (username, email, user_id))
                    con.commit()
                    return True
                except sqlite3.Error as e:
                    print(f"Database error: {e}")
                    return False
    
    def get_user_by_username(self, username):
        with self.get_db_connection() as con:
            cur = con.cursor()
            cur.execute("SELECT * FROM users WHERE username=?", (username,))
            user = cur.fetchone()
            return user
