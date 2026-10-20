from solution import smallest_string


def test_smallest_string_stop_at_first_a():
    assert smallest_string("cbabc") == "baabc"


def test_smallest_string_all_a():
    assert smallest_string("aa") == "az"


def test_smallest_string_skip_leading_a():
    assert smallest_string("acbbc") == "abaab"


def test_smallest_string_whole_string():
    assert smallest_string("leetcode") == "kddsbncd"


def test_smallest_string_single_a():
    assert smallest_string("a") == "z"


def test_smallest_string_single_letter():
    assert smallest_string("b") == "a"
