import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from multiprocessing import Lock

# Global lock to synchronize driver initialization
driver_lock = Lock()

# Function to initialize the driver
def get_driver():
    with driver_lock:  # Ensure only one process initializes at a time
        options = uc.ChromeOptions()
        options.add_argument("--disable-gpu")
        # Add other Chrome options as needed
        driver = uc.Chrome(options=options)
    return driver

# Wait for an element to be clickable
def wait_for_element(driver, by, value, timeout=15):
    try:
        return WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((by, value)))
    except TimeoutException:
        print(f"Element not interactable or not found: {value}")
        return None
