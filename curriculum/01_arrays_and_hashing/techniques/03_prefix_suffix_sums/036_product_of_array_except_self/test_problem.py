from solution import product_except_self


def test_product_except_self_normal():
    assert product_except_self([1, 2, 3, 4]) == [24, 12, 8, 6]


def test_product_except_self_with_zero():
    assert product_except_self([1, 0, 3]) == [0, 3, 0]


def test_product_except_self_two_elements():
    assert product_except_self([3, 5]) == [5, 3]
