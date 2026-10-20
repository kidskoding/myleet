from solution import reverse_prefix


def test_reverse_prefix_first_occurrence_only():
    assert reverse_prefix("abcdefd", "d") == "dcbaefd"


def test_reverse_prefix_middle():
    assert reverse_prefix("xyxzxe", "z") == "zxyxxe"


def test_reverse_prefix_absent():
    assert reverse_prefix("abcd", "z") == "abcd"


def test_reverse_prefix_single_char():
    assert reverse_prefix("a", "a") == "a"


def test_reverse_prefix_whole_word():
    assert reverse_prefix("abc", "c") == "cba"
