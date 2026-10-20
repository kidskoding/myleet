from solution import reorganize_string


def test_reorganize_string_possible():
    result = reorganize_string("aab")
    assert result in {"aba"}


def test_reorganize_string_impossible():
    assert reorganize_string("aaab") == ""


def test_reorganize_string_single_char():
    assert reorganize_string("a") == "a"
