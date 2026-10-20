from solution import remove_duplicate_letters


def test_remove_duplicate_letters_normal():
    assert remove_duplicate_letters("cbacdcbc") == "acdb"


def test_remove_duplicate_letters_already_unique():
    assert remove_duplicate_letters("abc") == "abc"


def test_remove_duplicate_letters_simple_repeat():
    assert remove_duplicate_letters("bcabc") == "abc"
