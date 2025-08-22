import os
import sqlite3
import bcrypt
import psycopg2
from urllib.parse import urlparse


class Database:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        if self.db_url:
            self._create_table_pg()
        else:
            self.db_path = "databse.db"
            self._create_table_sqlite()

    def _get_db_connection(self):
        if self.db_url:
            return self._get_db_connection_pg()
        else:
            return self._get_db_connection_sqlite()

    def _get_db_connection_sqlite(self):
        conn = sqlite3.connect(self.db_path)
        return conn

    def _get_db_connection_pg(self):
        url = urlparse(self.db_url)
        conn = psycopg2.connect(
            database=url.path[1:],
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port
        )
        return conn

    def _create_table_sqlite(self):
        conn = self._get_db_connection_sqlite()
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password BLOB NOT NULL
            )
            """
        )
        conn.commit()
        conn.close()

    def _create_table_pg(self):
        conn = self._get_db_connection_pg()
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password BYTEA NOT NULL
            )
            """
        )
        conn.commit()
        conn.close()
        
    def _user_already_exist(self, username):
        conn = self._get_db_connection()
        cur = conn.cursor()
        if self.db_url:
            cur.execute("SELECT * FROM users WHERE username=%s", (username,))
        else:
            cur.execute("SELECT * FROM users WHERE username=?", (username,))
        user = cur.fetchone()
        conn.close()
        return user is not None

    def add_user(self, username, email, hashed_password):
        conn = self._get_db_connection()
        cur = conn.cursor()
        try:
            if self.db_url:
                cur.execute("INSERT INTO users(username, email, password) VALUES(%s,%s,%s) RETURNING id, username", (username, email, hashed_password))
            else:
                cur.execute("INSERT INTO users(username, email, password) VALUES(?,?,?)", (username, email, hashed_password))
            conn.commit()
            if self.db_url:
                user = cur.fetchone()
            else:
                cur.execute("SELECT * FROM users WHERE username=?", (username,))
                user = cur.fetchone()
            return user
        except (sqlite3.IntegrityError, psycopg2.IntegrityError):
            return None # User already exists (due to UNIQUE constraint)
        finally:
            conn.close()
    
    def get_user_by_id(self, id):
        conn = self._get_db_connection()
        cur = conn.cursor()
        if self.db_url:
            cur.execute("SELECT * FROM users WHERE id=%s", (id,))
        else:
            cur.execute("SELECT * FROM users WHERE id=?", (id,))
        user = cur.fetchone()
        conn.close()
        return user

    def update_user_password(self, user_id, hashed_password):
        conn = self._get_db_connection()
        cur = conn.cursor()
        try:
            if self.db_url:
                cur.execute("UPDATE users SET password=%s WHERE id=%s", (hashed_password, user_id))
            else:
                cur.execute("UPDATE users SET password=? WHERE id=?", (hashed_password, user_id))
            conn.commit()
            return True
        except (sqlite3.Error, psycopg2.Error) as e:
            print(f"Database error: {e}")
            return False
        finally:
            conn.close()

    def update_user_with_password(self, user_id, username, email, hashed_password):
        conn = self._get_db_connection()
        cur = conn.cursor()
        try:
            if self.db_url:
                cur.execute("UPDATE users SET username=%s, email=%s, password=%s WHERE id=%s", (username, email, hashed_password, user_id))
            else:
                cur.execute("UPDATE users SET username=?, email=?, password=? WHERE id=?", (username, email, hashed_password, user_id))
            conn.commit()
            return True
        except (sqlite3.Error, psycopg2.Error) as e:
            print(f"Database error: {e}")
            return False
        finally:
            conn.close()

    def update_user_without_password(self, user_id, username, email):
        conn = self._get_db_connection()
        cur = conn.cursor()
        try:
            if self.db_url:
                cur.execute("UPDATE users SET username=%s, email=%s WHERE id=%s", (username, email, user_id))
            else:
                cur.execute("UPDATE users SET username=?, email=? WHERE id=?", (username, email, user_id))
            conn.commit()
            return True
        except (sqlite3.Error, psycopg2.Error) as e:
            print(f"Database error: {e}")
            return False
        finally:
            conn.close()
    
    def get_user_by_username(self, username):
        conn = self._get_db_connection()
        cur = conn.cursor()
        if self.db_url:
            cur.execute("SELECT * FROM users WHERE username=%s", (username,))
        else:
            cur.execute("SELECT * FROM users WHERE username=?", (username,))
        user = cur.fetchone()
        conn.close()
        return user
