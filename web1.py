# web1.py
from importingfeatures import get_driver, wait_for_element
from selenium.webdriver.common.by import By
import random
import time
from humanlike import (
    human_typing_with_errors,
    random_navigation,
    random_wait,
    random_scroll,
    click_random_link,
)

# Load User Agents
def set_random_user_agent(driver, agents_file="useragents.txt"):
    with open(agents_file, "r") as file:
        useragents = [line.strip() for line in file]
    user_agent = random.choice(useragents)
    driver.execute_cdp_cmd("Network.setUserAgentOverride", {"userAgent": user_agent})
    print(f"User agent set to: {user_agent}")

# Load Browsing Options
def load_browsing_terms(file="browsing.txt"):
    with open(file, "r") as f:
        return [line.strip() for line in f]

whattobrowse = load_browsing_terms()

# Browsing Function
def browsing(driver):
    search_what = random.choice(whattobrowse)
    driver.execute_script("window.open('');")  # Open new tab
    driver.switch_to.window(driver.window_handles[-1])  # Switch to the new tab
    driver.get("https://duckduckgo.com")
    search_box = wait_for_element(driver, By.NAME, "q", timeout=10)  # Wait for the search box
    if search_box:
        print(f"Typing '{search_what}' into the search box.")
        human_typing_with_errors(search_box, search_what)  # Mimic human typing
        search_box.send_keys("\n")  # Press Enter
        random_wait()
        random_scroll(driver)
    else:
        print("Failed to find search box. Exiting browsing.")

# Main Web Task
def webmain():
    driver = get_driver()
    try:
        set_random_user_agent(driver)
        webdestination = input("Enter Web Destination: ").strip()
        driver.get(webdestination)
        print(f"Navigated to {webdestination}.")
        random_wait()
        random_scroll(driver)

        # Perform additional random actions on the main site
        for _ in range(random.randint(2, 5)):  # Perform a few random actions
            action = random.randint(1, 3)
            if action == 1:
                print("Performing random scrolling.")
                random_scroll(driver)
            elif action == 2:
                print("Clicking a random link.")
                click_random_link(driver)
            elif action == 3:
                print("Navigating back, forward, or refreshing.")
                random_navigation(driver)
            random_wait()

        # Simulate switching to another activity
        print("Switching to browsing.")
        browsing(driver)
    finally:
        driver.quit()

if __name__ == "__main__":
    webmain()
