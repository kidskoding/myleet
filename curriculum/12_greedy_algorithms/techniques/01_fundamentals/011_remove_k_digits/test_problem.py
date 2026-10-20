from solution import remove_k_digits


def test_remove_k_digits_normal():
    assert remove_k_digits("1432219", 3) == "1219"


def test_remove_k_digits_strips_leading_zero():
    assert remove_k_digits("10200", 1) == "200"


def test_remove_k_digits_removes_everything():
    assert remove_k_digits("10", 2) == "0"
