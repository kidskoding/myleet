from solution import calculate_tax


def close(a: float, b: float) -> bool:
    return abs(a - b) < 1e-5


def test_calculate_tax_three_brackets():
    assert close(calculate_tax([[3, 50], [7, 10], [12, 25]], 10), 2.65)


def test_calculate_tax_zero_percent_first_bracket():
    assert close(calculate_tax([[1, 0], [4, 25], [5, 50]], 2), 0.25)


def test_calculate_tax_no_income():
    assert close(calculate_tax([[2, 50]], 0), 0.0)


def test_calculate_tax_income_hits_top_bracket():
    assert close(calculate_tax([[10, 10]], 10), 1.0)


def test_calculate_tax_full_rate():
    assert close(calculate_tax([[2, 100], [5, 100]], 5), 5.0)
