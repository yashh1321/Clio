import os
import argparse
import glob

def fix_line_endings(file_path):
    """Converts CRLF to LF in the specified file."""
    try:
        abs_path = os.path.abspath(file_path)
        with open(abs_path, 'rb') as fp:
            content = fp.read()
        
        if b'\r\n' in content:
            content = content.replace(b'\r\n', b'\n')
            with open(abs_path, 'wb') as fp:
                fp.write(content)
            print(f"Fixed: {abs_path}")
        else:
            print(f"Already LF: {abs_path}")
            
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Recursively convert CRLF line endings to LF for specified files.")
    parser.add_argument("--root", default=".", help="Root directory to start search from (default: current dir)")
    parser.add_argument("--pattern", default="**/code_summary.yaml", help="Glob pattern to match files (default: **/code_summary.yaml)")
    
    args = parser.parse_args()
    
    # Construct search pattern. specific attention to path joining for glob
    search_pattern = os.path.join(args.root, args.pattern)
    
    print(f"Searching for files matching: {search_pattern}")
    files = glob.glob(search_pattern, recursive=True)
    
    if not files:
        print("No files found matching the pattern.")
        return

    print(f"Found {len(files)} files. Processing...")
    for f in files:
        fix_line_endings(f)

if __name__ == "__main__":
    main()
