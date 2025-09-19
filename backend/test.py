#!/usr/bin/env python3

import subprocess
import sys
import re

def run_app():
    try:
        result = subprocess.run(
            ['/home/nodox/anaconda3/envs/cast/bin/python3', "app.py"],
            capture_output=True,
            text=True,
        )
        print(result.stdout, end='')
        print(result.stderr, end='')

        return result.returncode, result.stderr
    except Exception as e:
        print(f"Error while running app.py: {e}")
        sys.exit(1)

def extract_missing_module(stderr_output):
    match = re.search(r"ModuleNotFoundError: No module named '([^']+)'", stderr_output)
    if match:
        return match.group(1)
    return None

def install_module(module_name):
    print(f"⚙️  Installing missing module: {module_name}")
    result = subprocess.run(
        ['/home/nodox/anaconda3/envs/cast/bin/pip', "install", "--upgrade", module_name],
        text=True
    )
    if result.returncode != 0:
        print(f"❌ Failed to install module '{module_name}'")
       # sys.exit(result.returncode)

def main():
    while True:
        returncode, stderr_output = run_app()

        if returncode == 0:
            print("✅ app.py completed successfully.")
            break

        module_name = extract_missing_module(stderr_output)
        if module_name:
            install_module(module_name)
            print("🔁 Retrying...\n")
        else:
            print("❌ app.py failed for a reason other than a missing module.")
            sys.exit(returncode)

if __name__ == "__main__":
    main()

