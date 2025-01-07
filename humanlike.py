# humanlike.py
import random
import time

# Mimic human typing with errors
def human_typing_with_errors(element, text, error_rate=0.1):
    for char in text:
        if random.random() < error_rate:  # Simulate an error
            element.send_keys(random.choice("abcdefghijklmnopqrstuvwxyz"))  # Mistake
            time.sleep(random.uniform(0.1, 0.3))  # Pause for realism
            element.send_keys("\b")  # Backspace
        element.send_keys(char)
        time.sleep(random.uniform(0.1, 0.3))  # Mimic natural typing speed

# Mimic human typing without errors
def human_typing_without_errors(element, text):
    for char in text:
        if char == " ":  # Simulate pressing the space key
            delay = random.uniform(0.2, 0.5)  # Slightly longer delay for space
        elif char.isalnum():
            delay = random.uniform(0.05, 0.2)  # Faster typing
        else:
            delay = random.uniform(0.2, 0.4)  # Slower for special characters
        element.send_keys(char)
        time.sleep(delay)


# Random scrolling on a page
def random_scroll(driver):
    for _ in range(random.randint(3, 7)):  # Random number of scrolls
        scroll_distance = random.randint(100, 500)  # Random distance
        driver.execute_script(f"window.scrollBy(0, {scroll_distance});")
        time.sleep(random.uniform(0.5, 1.5))  # Pause between scrolls

# Random wait to mimic human behavior
def random_wait():
    time.sleep(random.uniform(2, 5))  # Random wait between 2 to 5 seconds

# Random Navigation
def random_navigation(driver):
    actions = ["back", "forward", "refresh"]
    action = random.choice(actions)

    if action == "back":
        print("Navigating back.")
        driver.back()
    elif action == "forward":
        print("Navigating forward.")
        driver.forward()
    elif action == "refresh":
        print("Refreshing the page.")
        driver.refresh()

    random_wait()

# Random Clicks
def click_random_link(driver):
    links = driver.find_elements(By.TAG_NAME, "a")
    if links:
        link = random.choice(links)
        print(f"Clicking random link: {link.get_attribute('href')}")
        link.click()
        random_wait()
    else:
        print("No clickable links found.")
