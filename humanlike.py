import random
import time
from selenium.webdriver.common.by import By

def human_typing_with_errors(element, text, error_rate=0.1):
    for char in text:
        if random.random() < error_rate:
            element.send_keys(random.choice("abcdefghijklmnopqrstuvwxyz"))
            time.sleep(random.uniform(0.1, 0.3))
            element.send_keys("\b")
        element.send_keys(char)
        time.sleep(random.uniform(0.1, 0.3))

def human_typing_without_errors(element, text):
    for char in text:
        delay = random.uniform(0.05, 0.3) if char.isalnum() else random.uniform(0.2, 0.4)
        element.send_keys(char)
        time.sleep(delay)

def random_scroll(driver):
    for _ in range(random.randint(3, 7)):
        driver.execute_script(f"window.scrollBy(0, {random.randint(100, 500)});")
        time.sleep(random.uniform(0.5, 1.5))

def random_wait():
    time.sleep(random.uniform(2, 5))

def random_navigation(driver):
    actions = ["back", "forward", "refresh"]
    action = random.choice(actions)
    if action == "back":
        driver.back()
    elif action == "forward":
        driver.forward()
    elif action == "refresh":
        driver.refresh()
    random_wait()

def click_random_link(driver):
    links = driver.find_elements(By.TAG_NAME, "a")
    if links:
        random.choice(links).click()
        random_wait()
