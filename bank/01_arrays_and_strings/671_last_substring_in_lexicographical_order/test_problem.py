from solution import last_substring


def test_last_substring_example_one():
    assert last_substring("abab") == "bab"


def test_last_substring_example_two():
    assert last_substring("leetcode") == "tcode"


def test_last_substring_single_char():
    assert last_substring("a") == "a"


def test_last_substring_all_same():
    assert last_substring("zzz") == "zzz"


def test_last_substring_tie_broken_late():
    assert last_substring("cacacb") == "cb"


def test_last_substring_max_at_end():
    assert last_substring("aaab") == "b"
