import os
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def clear_uc_cache():
    """Clear the undetected_chromedriver cache."""
    uc_cache_dir = os.path.expanduser("~\\AppData\\Roaming\\undetected_chromedriver")
    try:
        if os.path.exists(uc_cache_dir):
            for root, dirs, files in os.walk(uc_cache_dir, topdown=False):
                for name in files:
                    os.remove(os.path.join(root, name))
                for name in dirs:
                    os.rmdir(os.path.join(root, name))
            print("Cleared undetected_chromedriver cache.")
    except Exception as e:
        print(f"Error clearing cache: {e}")

def get_driver():
    """Initialize and return a new WebDriver instance."""
    options = uc.ChromeOptions()
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--no-sandbox")
    options.add_argument("--headless=new")  # Use non-legacy headless mode
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--start-maximized")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")

    try:
        driver = uc.Chrome(options=options)
        print("WebDriver initialized successfully.")
        return driver
    except Exception as e:
        print(f"Failed to initialize WebDriver: {e}")
        raise

def wait_for_element(driver, by, value, timeout=10):
    """Wait for an element to be present on the page."""
    try:
        return WebDriverWait(driver, timeout).until(EC.presence_of_element_located((by, value)))
    except Exception as e:
        print(f"Error waiting for element {value}: {e}")
        return None
