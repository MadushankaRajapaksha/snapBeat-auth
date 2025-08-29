import os
import sqlite3
import bcrypt
import threading # Added threading for lock
import shutil # Added shutil for file operations
from dotenv import load_dotenv

load_dotenv()
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

        if os.getenv("VERCEL") == "1" or os.getenv("VERCEL") == 1:
            # Define the path for the writable database in /tmp
            tmp_db_path = "/tmp/database.db"
            # Ensure /tmp directory exists
            os.makedirs(os.path.dirname(tmp_db_path), exist_ok=True)

            # Check if a database.db exists in the root (deployed static file)
            # and copy it to /tmp if /tmp/database.db doesn't exist yet
            if not os.path.exists(tmp_db_path) and os.path.exists("database.db"):
                shutil.copy("database.db", tmp_db_path)
            
            self.db_path = tmp_db_path
        else:
            # Use local path for development
            self.db_path = "database.db"

        self.init_db()

    def init_db(self):
        with self.get_db_connection() as con:
            cur = con.cursor()
            cur.execute(self.user_table_create_query)
            con.commit()

    def get_db_connection(self):
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        # Ensure the database schema is initialized for every connection
        # This helps in ephemeral environments where the DB might be new
        cur = conn.cursor()
        cur.execute(self.user_table_create_query)
        conn.commit()
        return conn

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
