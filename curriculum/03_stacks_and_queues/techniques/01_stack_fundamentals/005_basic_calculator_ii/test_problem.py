from solution import calculate_ii


def test_calculate_ii_mixed_precedence():
    assert calculate_ii("3+2*2") == 7


def test_calculate_ii_division_truncates():
    assert calculate_ii(" 3/2 ") == 1


def test_calculate_ii_single_number():
    assert calculate_ii("42") == 42
