import streamlit as st
from modules.database import login_user

def render_login():
    """Renders the Login Screen and handles authentication."""
    st.markdown(
        """
        <style>
        .main {
            background-color: #f5f5f5;
        }
        .stTextInput > div > div > input {
            border-radius: 10px;
        }
        </style>
        """,
        unsafe_allow_html=True
    )
    
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        st.title("🛡️ Integrity Editor")
        st.subheader("Proof of Write Platform")
        
        with st.form("login_form"):
            username = st.text_input("Username", placeholder="Enter your username")
            password = st.text_input("Password", type="password", placeholder="Enter your password")
            submitted = st.form_submit_button("Login", use_container_width=True)
            
            if submitted:
                user = login_user(username, password)
                if user:
                    st.success(f"Welcome back, {user[1]}!")
                    # Set Session State
                    st.session_state['user_id'] = user[0]
                    st.session_state['username'] = user[1]
                    st.session_state['role'] = user[2]
                    st.session_state['logged_in'] = True
                    st.rerun()
                else:
                    st.error("Invalid credentials. Please check your username and password.")

