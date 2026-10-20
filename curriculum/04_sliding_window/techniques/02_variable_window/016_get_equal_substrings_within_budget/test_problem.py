from solution import equal_substring


def test_equal_substring_full_budget():
    assert equal_substring("abcd", "bcdf", 3) == 3


def test_equal_substring_tight_budget():
    assert equal_substring("abcd", "cdef", 3) == 1


def test_equal_substring_zero_budget():
    assert equal_substring("abcd", "acde", 0) == 1
