from solution import min_non_zero_product


def test_min_non_zero_product_p1():
    assert min_non_zero_product(1) == 1


def test_min_non_zero_product_p2():
    assert min_non_zero_product(2) == 6


def test_min_non_zero_product_p3():
    assert min_non_zero_product(3) == 1512


def test_min_non_zero_product_p4():
    assert min_non_zero_product(4) == 581202553


def test_min_non_zero_product_p60_in_range():
    assert 0 <= min_non_zero_product(60) < 10**9 + 7
