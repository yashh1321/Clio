import streamlit as st
import pandas as pd
import json
from modules.database import get_all_submissions, get_submission_details

def render_dashboard():
    st.title("🎓 Teacher Dashboard")
    
    # --- Inbox View (List of Submissions) ---
    df = get_all_submissions()
    
    if df.empty:
        st.info("No submissions received yet.")
        return

    # Create a helpful label for the dropdown
    # Format: "ID: 1 | Student: Yash | Title: Philosophy 101 | Score: 95"
    df['label'] = df.apply(lambda x: f"ID: {x['id']} | 👤 {x['Student']} | 📄 {x['title']} | Score: {x['integrity_score']}", axis=1)
    
    # Selection Dropdown
    selected_label = st.selectbox("Select Submission to Grade:", df['label'])
    
    # Extract ID from label (simple parsing)
    selected_id = int(selected_label.split("|")[0].replace("ID:", "").strip())
    
    st.divider()
    
    # --- Detailed Grading View ---
    submission = get_submission_details(selected_id)
    if submission:
        content, metrics_json = submission
        metrics = json.loads(metrics_json)
        
        # Layout: Left (Essay) | Right (Analytics)
        col_essay, col_stats = st.columns([2, 1])
        
        with col_essay:
            st.subheader("📄 Student Essay")
            st.text_area("Content", content, height=600, disabled=True)
            
        with col_stats:
            st.subheader("📊 Integrity Report")
            
            # Score Card
            score = metrics.get('integrity_score', 100) # Fallback if not in json
            # If score wasn't in json, recalculate or use DB value passed separately. 
            # For simplicity, let's use the one passed in the label or re-calculate.
            # Actually, let's just grab it from the dataframe for display consistency
            score = df[df['id'] == selected_id]['integrity_score'].values[0]

            if score > 80:
                st.success(f"## Score: {score}/100\n✅ High Integrity")
            elif score > 50:
                st.warning(f"## Score: {score}/100\n⚠️ Needs Review")
            else:
                st.error(f"## Score: {score}/100\n🚨 Suspicious")
                
            st.divider() 
            
            # Detailed Metrics
            st.metric("Words Per Minute (WPM)", f"{metrics.get('wpm', 0)}")
            
            paste_count = metrics.get('paste_count', 0)
            st.metric("Paste Events Detected", paste_count, delta=-paste_count, delta_color="inverse")
            
            duration_min = metrics.get('duration_sec', 0) // 60
            st.metric("Time Spent", f"{duration_min} min")
            
            st.markdown("### 🧠 Analysis")
            if paste_count > 2:
                st.write("❌ **High Paste Rate:** Large blocks of text were inserted instantly.")
            else:
                st.write("✅ **Natural Typing:** Paste rate is within normal limits.")
                
            if metrics.get('wpm', 0) > 100:
                st.write("❌ **Superhuman Speed:** WPM is suspiciously high.")
            
            st.divider()
            st.button("Mark as Graded", disabled=True, help="Feature coming in v2")
