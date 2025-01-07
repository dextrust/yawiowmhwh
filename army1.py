import requests
from YT import main as yt_main  # Import YouTube task
from web1 import webmain  # Import Website task
import random
from multiprocessing import Process

def main():
    runprogram = input("Run program? [Y] / [N]: ")
    if runprogram.lower() == "y":
        if locationcheck():  # Check location before proceeding
            task()
    else:
        print("Goodbye!")

def task():
    tasklist = ["Auto[1]", "Customized Task[2]"]
    for x in tasklist:
        print(x)

    runtask = input("Choose Task: ")
    if runtask == "1":  # Auto Task
        print("Running Auto Task...")
        auto_task()
    elif runtask == "2":  # Customized Task
        print("Customized Task selected.")
        customized_task()
    else:
        print("Invalid option. Exiting.")

def auto_task():
    # Randomly choose between tasks
    chosen_task = random.choice(["YouTube", "Website"])
    process_count = random.randint(5, 20)  # Randomly decide number of processes
    print(f"Auto-selected Task: {chosen_task}")
    print(f"Randomly chosen process count: {process_count}")

    if chosen_task == "YouTube":
        channel_name = input("Enter the YouTube Channel Name: ")
        run_multiprocessing(yt_main, process_count, channel_name)
    elif chosen_task == "Website":
        run_multiprocessing(webmain, process_count)

def customized_task():
    print("Available Tasks:")
    print("YouTube[1], Website[2]")
    chosen_task = input("Select Task: ")

    if chosen_task not in ["1", "2"]:
        print("Invalid Task. Exiting.")
        return

    process_count = input("Enter number of processes to run: ")
    if not process_count.isdigit():
        print("Invalid input. Number of processes must be an integer. Exiting.")
        return

    process_count = int(process_count)
    if chosen_task == "1":
        channel_name = input("Enter the YouTube Channel Name: ")
        print(f"Running YouTube task with {process_count} processes...")
        run_multiprocessing(yt_main, process_count, channel_name)
    elif chosen_task == "2":
        print(f"Running Website task with {process_count} processes...")
        run_multiprocessing(webmain, process_count)

# Multiprocessing Function
def run_multiprocessing(task_function, process_count, *args):
    processes = []
    for _ in range(process_count):
        process = Process(target=task_function, args=args)
        processes.append(process)
        process.start()

    for process in processes:
        process.join()

# Location Checker (Using API)
def locationcheck():
    try:
        print("Checking location using IP-based API...")
        response = requests.get("https://ipinfo.io")
        if response.status_code == 200:
            data = response.json()
            location = data.get("country", "Unknown")  # Get the country code
            print(f"Detected Location: {location}")
            if location != "ID":  # Check if location is not Indonesia
                print("Location is not in Indonesia. Proceeding...")
                return True
            else:
                print("Location is in Indonesia. Program aborted.")
                return False
        else:
            print(f"Error: Received status code {response.status_code} from IPInfo API.")
            return False
    except Exception as e:
        print(f"Error during location check: {e}")
        return False

if __name__ == "__main__":
    main()
