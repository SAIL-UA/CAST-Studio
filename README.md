# CAST Story Studio

This project has two main components:  
1. A **Flask** backend  
2. A **React** frontend  

The two components must be started separately, and **the backend must be started first**.



## Running the Backend

1. **Navigate to the backend directory and activate conda env**:
   ```bash
   cd backend
   conda activate cast

2. **Run the backend**:
    ```bash
    sudo env "PATH=$PATH" python app.py
    ```

    - `sudo` is used so the program can access the necessary files from other user accounts.
    - `PATH=$PATH` ensures the user’s conda paths are recognized during execution.



## Running the Frontend

1. **Open a new terminal** (while the backend is still running).
2. **Navigate to the frontend directory and activate conda env**:
    ```bash
    cd frontend/
    conda activate cast
    ```
3. **Start the frontend**:
    ```bash
    npm run start
    ```
## Port Configuration
- In the development version (and what's uploaded to GitHub) the backend runs on **port 8076** and the frontend runs on **port 8075** by default.
- For the live version:
    - Change **app.py** to run on port **8051**.
    - In **package.json** set the proxy to match **8051**.
    - Also in **package.json**, set the frontend's port to **8050**.

## Running in Tmux
For the live environment, we run both processes in tmux so they keep running after we exit the virtual machine. Common tmux usage:

```bash
tmux attach -t <session_number>
```

This attaches to the specified tmux session where the backend (2) and frontend (3) are running.