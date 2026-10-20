from solution import max_product


def test_max_product_normal():
    assert max_product([2, 3, -2, 4]) == 6


def test_max_product_with_zero():
    assert max_product([-2, 0, -1]) == 0


def test_max_product_two_negatives():
    assert max_product([-2, 3, -4]) == 24
