import os
from flask import Flask,render_template, request, jsonify,make_response,redirect,url_for
import json
import bcrypt
from core.db import Database
import jwt
from dotenv import load_dotenv
import shutil

load_dotenv()

app = Flask(__name__, template_folder="templates")

db = Database()

SECRET = os.getenv("SECRET")
 
####################################### 
#              MideleWares            #
#      protecr some special pages     #
#######################################

@app.before_request
def check_authentication():
    protected_paths = ['/account','/edit-profile','/change-password']

    if request.path in protected_paths:
        
        token = request.cookies.get('token')
        
        if token: # Ensure token exists before decoding
            try:
                # token validate is valid 
                user_data = jwt.decode(token.encode('utf-8'), SECRET, algorithms=["HS256"])  # Verify token without expiration check
            except jwt.exceptions.DecodeError:
                return redirect(url_for('login_page')) # Redirect to login if token is invalid
        else:
            return redirect(url_for('login_page')) # Redirect to login if no token is found
        if not user_data: # Simplified check for user_data
            return redirect(url_for('login_page'))
          
          
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/signup")
def signup_page():
    return render_template("signup.html")


@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/account")
def account_page():
    token = request.cookies.get('token')
    if token:
        try:
            user_data = jwt.decode(token, SECRET, algorithms=["HS256"])
            username = user_data.get('username')
            user_id = user_data.get('id')
          
            user_details = db.get_user_by_id(user_id)
            email = user_details[2] if user_details else "N/A" # Assuming email is at index 2
            
            response = make_response(render_template("account.html", username=username, email=email))
            response.headers["Content-Type"] = "text/html; charset=utf-8"
            return response
        except jwt.ExpiredSignatureError:
            return redirect(url_for('login_page'))
        except jwt.InvalidTokenError:
            return redirect(url_for('login_page'))
    return redirect(url_for('login_page'))
 

# Backend
 

@app.route("/auth/signup", methods=["POST"])
def signup():
 
    username = request.form["username"]
    email = request.form["email"]
    
    # note
    pattern = json.loads(request.form["rhythmPattern"])
    
     
    
    passString = ""
    for note in pattern:
        passString += note["note"]
    
    password = passString  
    
    # password convert to  hash code 
    
    
    # password turn to bytes
    bytes_password = password.encode("utf-8")
    
    # generate salt 
    
    salt = bcrypt.gensalt()
    
    # use bytepass and salt genrate hased passord 
    
    hashed_password = bcrypt.hashpw(bytes_password,salt)
    # save user in database 
    db_res = db.add_user(username, email, hashed_password)
    
    if db_res is None:
        # //retun erro page with say user a leard exists
        return render_template("auth/err.html", message="User already exist", naviagte= "/signup",naviagte_msg = "please Retry")
    if db_res:
        # create jwt token 
        token = jwt.encode({"id":db_res[0],"username":db_res[1]},SECRET,algorithm="HS256")
        
        res = make_response(render_template("auth/success.html", message="User created successfully."))
        res.set_cookie("token",token)
    
        # return a page show suuce registrayon and redirect to /acc  page 
        return res
    else:
        return render_template("auth/err.html", message="User didn't create, please try again." , naviagte= "/signup",naviagte_msg = "please Retry")

@app.route("/auth/login",methods=["POST"])
def login():
    
    username = request.form["username"]
    rhythm_pattern_str = request.form.get("rhythmPattern")

    if not rhythm_pattern_str:
        return render_template("auth/err.html", message="Password is Missing", naviagte= url_for('login_page'),naviagte_msg = "Retry")
        

    try:
        pattern = json.loads(rhythm_pattern_str)
    except json.JSONDecodeError:
        return render_template("auth/err.html", message="Internal Server Error Please Contact Admin", naviagte= "login",naviagte_msg = "Retry")
        # return jsonify({"status": "error", "message": "Invalid rhythm pattern format."}), 400
    
    passString = ""
    for note in pattern:
        passString += note["note"]
    
    password = passString  
    
    # Get user from database
    db_user = db.get_user_by_username(username) # Assuming a method to get user by username exists
    
    if db_user:
         
        stored_hashed_password = db_user[3] # Hashed password is at index 3
        
        
        if isinstance(stored_hashed_password, str):
            stored_hashed_password = stored_hashed_password.encode("utf-8")

        if bcrypt.checkpw(password.encode("utf-8"), stored_hashed_password):
            token = jwt.encode({"id": db_user[0], "username": db_user[1]}, SECRET, algorithm="HS256")
            res = make_response(render_template("auth/success.html", message="Login successful!"))
            res.set_cookie("token", token)
            return res
        else:
            return render_template("auth/err.html", message="Invalid username or rhythm pattern.")
    else:
        return render_template("auth/err.html", message="Invalid username or rhythm pattern.", naviagte= "/login",naviagte_msg = "Retry")


@app.route("/logout")
def logout():
    res = make_response(redirect(url_for('index')))
    res.delete_cookie("token")
    return res

@app.route("/edit-profile", methods=["GET", "POST"])
def edit_profile_page():
    token = request.cookies.get('token')
    if not token:
        return redirect(url_for('login_page'))

    try:
        user_data = jwt.decode(token, SECRET, algorithms=["HS256"])
        user_id = user_data.get('id')
        user_details = db.get_user_by_id(user_id)

        if not user_details:
            return render_template("auth/err.html", message="User not found.", naviagte="/account", naviagte_msg="Back to Account")

        user = {
            "username": user_details[1],
            "email": user_details[2]
        }

        if request.method == "POST":
            new_username = request.form["username"]
            new_email = request.form["email"]

            db.update_user_without_password(user_id, new_username, new_email)
            

             
            
            # Update the token with new username if it changed
            if new_username != user["username"]:
                updated_token = jwt.encode({"id": user_id, "username": new_username}, SECRET, algorithm="HS256")
                res = make_response(redirect(url_for('account_page')))
                res.set_cookie("token", updated_token)
                return res

            return redirect(url_for('account_page'))

        return render_template("edit-profile.html", user=user)

    except jwt.ExpiredSignatureError:
        return redirect(url_for('login_page'))
    except jwt.InvalidTokenError:
        return redirect(url_for('login_page'))

@app.route("/change-password", methods=["GET", "POST"])
def change_password():
    if request.method == "GET":
        return render_template("change-password.html")
    elif request.method == "POST":
        token = request.cookies.get('token')
        if not token:
            return jsonify({"message": "Unauthorized"}), 401

        try:
            user_data = jwt.decode(token, SECRET, algorithms=["HS256"])
            user_id = user_data.get('id')
            
            data = request.get_json()
            old_rhythm_pattern = data.get('old_rhythm_pattern')
            new_rhythm_pattern = data.get('new_rhythm_pattern')

            if not old_rhythm_pattern or not new_rhythm_pattern:
                return jsonify({"message": "Old and new rhythm patterns are required."}), 400

            old_pass_string = "".join([note["note"] for note in old_rhythm_pattern])
            new_pass_string = "".join([note["note"] for note in new_rhythm_pattern])

            user_details = db.get_user_by_id(user_id)
            if not user_details:
                return jsonify({"message": "User not found."}), 404

            stored_hashed_password = user_details[3]
            if isinstance(stored_hashed_password, str):
                stored_hashed_password = stored_hashed_password.encode("utf-8")

            if not bcrypt.checkpw(old_pass_string.encode("utf-8"), stored_hashed_password):
                return jsonify({"message": "Invalid old rhythm pattern."}), 400

            bytes_new_password = new_pass_string.encode("utf-8")
            salt = bcrypt.gensalt()
            hashed_new_password = bcrypt.hashpw(bytes_new_password, salt)

            db.update_user_password(user_id, hashed_new_password)
            res = make_response(jsonify({"message": "Password changed successfully!"}))
            res.delete_cookie("token")
            return res

        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token. Please log in again."}), 401
        except Exception as e:
            print(f"Error changing password: {e}")
            return jsonify({"message": "An internal error occurred."}), 500
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
