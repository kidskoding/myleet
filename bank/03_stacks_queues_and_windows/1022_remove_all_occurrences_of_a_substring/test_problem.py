from solution import remove_occurrences


def test_remove_occurrences_example_one():
    assert remove_occurrences("daabcbaabcbc", "abc") == "dab"


def test_remove_occurrences_example_two():
    assert remove_occurrences("axxxxyyyyb", "xy") == "ab"


def test_remove_occurrences_whole_string():
    assert remove_occurrences("abc", "abc") == ""


def test_remove_occurrences_absent_part():
    assert remove_occurrences("aaa", "b") == "aaa"


def test_remove_occurrences_cascading():
    assert remove_occurrences("aabcbc", "abc") == ""
