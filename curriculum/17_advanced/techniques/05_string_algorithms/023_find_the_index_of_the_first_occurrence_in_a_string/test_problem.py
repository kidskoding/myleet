from solution import build_failure_table, str_str


def test_str_str_found():
    assert str_str("sadbutsad", "sad") == 0


def test_str_str_not_found():
    assert str_str("leetcode", "leeto") == -1


def test_str_str_empty_needle():
    assert str_str("abc", "") == 0


def test_build_failure_table_with_repeats():
    assert build_failure_table("aabaaab") == [0, 1, 0, 1, 2, 2, 3]


def test_build_failure_table_no_repeats():
    assert build_failure_table("abc") == [0, 0, 0]
