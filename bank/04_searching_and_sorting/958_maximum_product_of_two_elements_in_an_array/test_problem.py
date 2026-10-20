from solution import max_product


def test_max_product_example_one():
    assert max_product([3, 4, 5, 2]) == 12


def test_max_product_duplicate_max():
    assert max_product([1, 5, 4, 5]) == 16


def test_max_product_two_elements():
    assert max_product([3, 7]) == 12


def test_max_product_ones():
    assert max_product([1, 1]) == 0


def test_max_product_limits():
    assert max_product([1000, 1, 1000]) == 998001
