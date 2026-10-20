from solution import sum as add


def test_sum_positive():
    assert add(12, 5) == 17


def test_sum_mixed_signs():
    assert add(-10, 4) == -6


def test_sum_both_negative():
    assert add(-100, -100) == -200


def test_sum_zeros():
    assert add(0, 0) == 0


def test_sum_cancels_out():
    assert add(57, -57) == 0
