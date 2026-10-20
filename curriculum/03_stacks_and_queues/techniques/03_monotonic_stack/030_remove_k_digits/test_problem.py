from solution import remove_k_digits


def test_remove_k_digits_normal_case():
    assert remove_k_digits("1432219", 3) == "1219"


def test_remove_k_digits_removes_all_digits():
    assert remove_k_digits("10", 2) == "0"


def test_remove_k_digits_single_digit_remove_zero():
    assert remove_k_digits("9", 0) == "9"
