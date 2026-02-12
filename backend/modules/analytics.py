import time

def calculate_wpm(char_count, start_time):
    """Calculates Words Per Minute based on characters and elapsed time."""
    elapsed_minutes = (time.time() - start_time) / 60
    if elapsed_minutes < 0.01:
        return 0
    
    # Average word length is 5 chars
    word_count = char_count / 5
    return int(word_count / elapsed_minutes)

def detect_paste(prev_len, curr_len, threshold=50):
    """
    Returns True if the user added more than 'threshold' characters in a single update.
    This indicates a Paste event (or extremely fast typing between updates).
    """
    delta = curr_len - prev_len
    if delta > threshold:
        return True, delta
    return False, delta

def calculate_integrity_score(paste_count, wpm, total_time_minutes):
    """
    Generates a 0-100 score.
    - Penalizes Pastes heavily (-20 per paste).
    - Penalizes superhuman WPM (>150).
    - Penalizes extremely short time (<5 mins for long text).
    """
    score = 100
    
    # Paste Penalty
    score -= (paste_count * 20)
    
    # Speed Penalty (Anti-Bot)
    if wpm > 150:
        score -= 40
    elif wpm > 100:
        score -= 10
        
    # Cap at 0-100
    return max(0, min(score, 100))
