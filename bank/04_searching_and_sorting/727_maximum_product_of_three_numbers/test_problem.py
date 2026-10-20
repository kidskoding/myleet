from solution import maximum_product


def test_maximum_product_exactly_three_mixed():
    assert maximum_product([1, 2, -3]) == -6


def test_maximum_product_three_largest():
    assert maximum_product([1, 2, 3, 4]) == 24


def test_maximum_product_all_negative():
    assert maximum_product([-1, -2, -3]) == -6


def test_maximum_product_two_negatives_win():
    assert maximum_product([-10, -10, 1, 3, 2]) == 300


def test_maximum_product_zero_is_best():
    assert maximum_product([-5, -4, 0]) == 0


def test_maximum_product_large_negatives_with_positives():
    assert maximum_product([-100, -98, -1, 2, 3, 4]) == 39200
