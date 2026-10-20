from solution import buddy_strings


def test_buddy_strings_one_swap():
    assert buddy_strings("ab", "ba") is True


def test_buddy_strings_equal_without_repeat():
    assert buddy_strings("ab", "ab") is False


def test_buddy_strings_equal_with_repeat():
    assert buddy_strings("aa", "aa") is True


def test_buddy_strings_two_swaps_needed():
    assert buddy_strings("abcd", "badc") is False


def test_buddy_strings_length_mismatch():
    assert buddy_strings("ab", "abc") is False


def test_buddy_strings_two_diffs_not_crossing():
    assert buddy_strings("ab", "cd") is False
