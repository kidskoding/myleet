from solution import make_fancy_string


def test_make_fancy_string_one_triple():
    assert make_fancy_string("leeetcode") == "leetcode"


def test_make_fancy_string_two_long_runs():
    assert make_fancy_string("aaabaaaa") == "aabaa"


def test_make_fancy_string_already_fancy():
    assert make_fancy_string("aab") == "aab"


def test_make_fancy_string_single_char():
    assert make_fancy_string("a") == "a"


def test_make_fancy_string_one_long_run():
    assert make_fancy_string("aaaaa") == "aa"
