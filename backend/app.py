import streamlit as st
from modules.database import init_db
from modules.auth import render_login
from modules.editor import render_editor
from modules.dashboard import render_dashboard

# Page Configuration
st.set_page_config(
    page_title="Integrity Editor",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Initialize DB
init_db()

# Session State Initialization
if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False

def main():
    """Main Router"""
    if not st.session_state['logged_in']:
        render_login()
    else:
        # Router based on Role
        if st.session_state['role'] == 'student':
            student_dashboard()
        elif st.session_state['role'] == 'teacher':
            teacher_dashboard()

def student_dashboard():
    st.sidebar.title(f"Student: {st.session_state['username']}")
    if st.sidebar.button("Logout"):
        st.session_state['logged_in'] = False
        st.session_state['editor_content'] = "" # Clear cache
        st.rerun()
    
    # Render the Editor Module
    render_editor()

def teacher_dashboard():
    st.sidebar.title(f"Prof. {st.session_state['username']}")
    if st.sidebar.button("Logout"):
        st.session_state['logged_in'] = False
        st.rerun()
        
    # Render the Dashboard Module
    render_dashboard()
    st.sidebar.title(f"Prof. {st.session_state['username']}")
    if st.sidebar.button("Logout"):
        st.session_state['logged_in'] = False
        st.rerun()
        
    st.title("🎓 Grading Dashboard")
    st.write("Incoming Submissions...")
    
    # Placeholder for Epic 3
    st.info("🚧 The Teacher Dashboard (Epic 3) will be implemented next.")

if __name__ == "__main__":
    main()
