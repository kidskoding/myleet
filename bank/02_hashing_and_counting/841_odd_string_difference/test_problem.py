from solution import odd_string


def test_odd_string_example_last():
    assert odd_string(["adc", "wzy", "abc"]) == "abc"


def test_odd_string_example_middle():
    assert odd_string(["aaa", "bob", "ccc", "ddd"]) == "bob"


def test_odd_string_first_is_odd():
    assert odd_string(["az", "ba", "cb"]) == "az"


def test_odd_string_steps_of_two():
    assert odd_string(["abc", "bcd", "ace"]) == "ace"


def test_odd_string_negative_differences():
    assert odd_string(["cba", "dcb", "zyx", "zzz"]) == "zzz"
