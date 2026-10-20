from solution import min_window


def test_min_window_normal():
    assert min_window("ADOBECODEBANC", "ABC") == "BANC"


def test_min_window_no_valid_window():
    assert min_window("a", "aa") == ""


def test_min_window_no_matching_characters():
    assert min_window("a", "b") == ""


def test_min_window_exact_match():
    assert min_window("a", "a") == "a"
