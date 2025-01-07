import time
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from importingfeatures import get_driver, wait_for_element  # Import utility functions

def main(channel_name):
    driver = get_driver()  # Initialize the WebDriver
    driver.get("https://www.youtube.com")

    try:
        # Attempt to find the search box by name
        print("Attempting to find search box by NAME.")
        search_box = wait_for_element(driver, By.NAME, "search_query")

        # If it fails, try to find the search box by XPath
        if not search_box:
            print("Failed to find search box by NAME. Trying XPath...")
            search_box = wait_for_element(driver, By.XPATH, '//*[@id="center"]/yt-searchbox/div[1]/form/input')
        
        if search_box:
            search_box.send_keys(channel_name)  # Input the channel name into the search box
            search_box.send_keys(Keys.RETURN)  # Submit the search
            print(f"Searching for channel: {channel_name}")
            time.sleep(3)
            
            # Here, you could add more logic to navigate through the search results
            # For example, clicking the first result (if you wish)
            # first_result = wait_for_element(driver, By.XPATH, '//ytd-video-renderer[1]') 
            # first_result.click()

            print("YouTube task completed.")

        else:
            print("Search box not found on YouTube page.")

    except Exception as e:
        print(f"An error occurred during YouTube task: {e}")

    finally:
        driver.quit()  # Ensure the browser is closed after task completion

