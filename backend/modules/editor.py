import streamlit as st
import time
from streamlit_quill import st_quill
from modules.analytics import calculate_wpm, detect_paste, calculate_integrity_score
from modules.database import submit_assignment

def init_editor_state():
    """Initialize session state variables for the editor."""
    if 'editor_content' not in st.session_state:
        st.session_state['editor_content'] = ""
    if 'start_time' not in st.session_state:
        st.session_state['start_time'] = time.time()
    if 'paste_count' not in st.session_state:
        st.session_state['paste_count'] = 0
    if 'prev_len' not in st.session_state:
        st.session_state['prev_len'] = 0
    if 'submission_status' not in st.session_state:
        st.session_state['submission_status'] = None

def render_editor():
    init_editor_state()
    
    # --- Top Bar: Assignment Info & Controls ---
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        assignment_title = st.text_input("Assignment Title", value="Philosophy 101 - Final Essay")
    with col2:
        editor_mode = st.radio("Editor Mode", ["📝 Notion (Markdown)", "📄 Word (Rich Text)"], horizontal=True)
    with col3:
        # Submit Button Logic
        if st.button("🚀 Submit to Class", type="primary", use_container_width=True):
            wpm = calculate_wpm(len(st.session_state['editor_content']), st.session_state['start_time'])
            score = calculate_integrity_score(
                st.session_state['paste_count'], 
                wpm, 
                (time.time() - st.session_state['start_time'])/60
            )
            
            metrics = {
                "wpm": wpm,
                "paste_count": st.session_state['paste_count'],
                "duration_sec": int(time.time() - st.session_state['start_time'])
            }
            
            submit_assignment(
                st.session_state['user_id'], 
                assignment_title, 
                st.session_state['editor_content'], 
                metrics, 
                score
            )
            st.session_state['submission_status'] = "submitted"
            st.success("Assignment Submitted Successfully!")
            st.balloons()

    st.divider()

    # --- Sidebar: Live Integrity Analytics ---
    with st.sidebar:
        st.header("🛡️ Integrity Monitor")
        st.caption("Monitoring active. Do not paste large blocks of text.")
        
        current_len = len(st.session_state['editor_content'])
        wpm = calculate_wpm(current_len, st.session_state['start_time'])
        
        # Detect Paste Logic
        is_paste, delta = detect_paste(st.session_state['prev_len'], current_len)
        if is_paste:
            st.session_state['paste_count'] += 1
            st.toast(f"⚠️ Paste Detected! (+{delta} chars)", icon="🚨")
        
        # Update Previous Length for next run
        st.session_state['prev_len'] = current_len
        
        # Display Metrics
        col_a, col_b = st.columns(2)
        col_a.metric("WPM", wpm)
        col_b.metric("Pastes", st.session_state['paste_count'], delta=1 if is_paste else 0, delta_color="inverse")
        
        st.metric("Time Elapsed", f"{int(time.time() - st.session_state['start_time'])}s")
        
        # Real-time Score Estimate
        live_score = calculate_integrity_score(
            st.session_state['paste_count'], 
            wpm, 
            (time.time() - st.session_state['start_time'])/60
        )
        
        if live_score > 80:
            st.success(f"Integrity Score: {live_score}/100")
        elif live_score > 50:
            st.warning(f"Integrity Score: {live_score}/100")
        else:
            st.error(f"Integrity Score: {live_score}/100")

    # --- Main Editor Area ---
    
    if st.session_state['submission_status'] == "submitted":
        st.info("This assignment has been submitted. View it in your history.")
        st.text_area("Final Content", st.session_state['editor_content'], disabled=True)
        return

    # Mode Selection Logic
    content = ""
    if "Notion" in editor_mode:
        # Notion Style: Simple Text Area
        content = st.text_area(
            "Start writing...", 
            value=st.session_state['editor_content'], 
            height=600,
            placeholder="# Introduction\n\nStart typing here..."
        )
    else:
        # Word Style: Quill Editor
        content = st_quill(
            value=st.session_state['editor_content'], 
            placeholder="Start writing your essay here...",
            html=False, # We want plain text for analysis
            key="quill_editor"
        )

    # Sync Content to State
    # Note: Streamlit widgets update immediately, but we ensure it's saved to key
    if content != st.session_state['editor_content']:
        st.session_state['editor_content'] = content
        st.rerun() # Force rerun to update analytics immediately
