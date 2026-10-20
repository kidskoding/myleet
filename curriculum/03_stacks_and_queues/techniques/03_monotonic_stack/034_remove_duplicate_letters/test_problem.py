from solution import remove_duplicate_letters


def test_remove_duplicate_letters_normal():
    assert remove_duplicate_letters("bcabc") == "abc"


def test_remove_duplicate_letters_keeps_needed_larger_letter():
    assert remove_duplicate_letters("cbacdcbc") == "acdb"
