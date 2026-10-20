from solution import BrowserHistory


def test_browser_history_back_and_forward():
    history = BrowserHistory("leetcode.com")
    history.visit("google.com")
    history.visit("facebook.com")
    history.visit("youtube.com")

    assert history.back(1) == "facebook.com"
    assert history.back(1) == "google.com"
    assert history.forward(1) == "facebook.com"


def test_browser_history_visit_truncates_forward():
    history = BrowserHistory("leetcode.com")
    history.visit("google.com")
    history.visit("facebook.com")
    history.back(1)
    history.visit("linkedin.com")

    assert history.forward(2) == "linkedin.com"


def test_browser_history_clamps_at_the_ends():
    history = BrowserHistory("leetcode.com")
    history.visit("google.com")

    assert history.back(7) == "leetcode.com"
