import os
import multiprocessing
from YT import main as yt_main  # Import YouTube task main function
from web1 import main as web_main  # Import Website task main function
from importingfeatures import clear_uc_cache  # Import cache clearing utility

def locationcheck():
    import requests
    try:
        response = requests.get("https://ipinfo.io", timeout=5)
        data = response.json()
        print(f"Detected Location: {data.get('country', 'Unknown')}")
        return data.get('country', 'Unknown')
    except Exception as e:
        print(f"Error checking location: {e}")
        return None

def run_task(task_name, process_count, additional_args=None):
    tasks = {
        "YouTube": yt_main,
        "Website": web_main
    }
    if task_name not in tasks:
        print("Invalid task name!")
        return

    task_function = tasks[task_name]
    processes = []
    for _ in range(process_count):
        p = multiprocessing.Process(target=task_function, args=additional_args or ())
        processes.append(p)
        p.start()

    for p in processes:
        p.join()

def main():
    run_program = input("Run program? [Y] / [N]: ").strip().lower()
    if run_program != 'y':
        print("Program exited.")
        return

    print("Checking location using IP-based API...")
    location = locationcheck()

    if location != "ID":  # Assuming 'ID' is the country code for Indonesia
        print("Location is not in Indonesia. Proceeding...")
    else:
        print("Location is in Indonesia. Exiting program.")
        return

    print("Auto[1]\nCustomized Task[2]")
    choice = input("Choose Task: ").strip()

    if choice == "1":
        print("Auto task not implemented yet. Exiting.")
        return

    elif choice == "2":
        print("Customized Task selected.")
        print("Available Tasks: YouTube[1], Website[2]")
        task_choice = input("Select Task: ").strip()

        task_name = "YouTube" if task_choice == "1" else "Website" if task_choice == "2" else None
        if not task_name:
            print("Invalid task selected. Exiting.")
            return

        process_count = int(input("Enter number of processes to run: ").strip())
        additional_args = None

        if task_name == "YouTube":
            channel_name = input("Enter the YouTube Channel Name: ").strip()
            additional_args = (channel_name,)

        # Clear undetected_chromedriver cache before starting tasks
        clear_uc_cache()

        print(f"Running {task_name} task with {process_count} processes...")
        run_task(task_name, process_count, additional_args)

if __name__ == "__main__":
    main()
