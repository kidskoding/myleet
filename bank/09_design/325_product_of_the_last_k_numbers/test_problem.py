from solution import ProductOfNumbers


def test_product_of_numbers_example():
    p = ProductOfNumbers()
    for num in [3, 0, 2, 5, 4]:
        p.add(num)
    assert p.get_product(2) == 20
    assert p.get_product(3) == 40
    assert p.get_product(4) == 0
    p.add(8)
    assert p.get_product(2) == 32


def test_product_of_numbers_single():
    p = ProductOfNumbers()
    p.add(7)
    assert p.get_product(1) == 7


def test_product_of_numbers_whole_stream():
    p = ProductOfNumbers()
    for num in [2, 3, 4]:
        p.add(num)
    assert p.get_product(3) == 24


def test_product_of_numbers_zero_is_last():
    p = ProductOfNumbers()
    for num in [5, 6, 0]:
        p.add(num)
    assert p.get_product(1) == 0
    assert p.get_product(3) == 0


def test_product_of_numbers_multiple_zeros():
    p = ProductOfNumbers()
    for num in [0, 4, 0, 2, 3]:
        p.add(num)
    assert p.get_product(2) == 6
    assert p.get_product(3) == 0
    assert p.get_product(5) == 0


def test_product_of_numbers_ones():
    p = ProductOfNumbers()
    for num in [1, 1, 1, 9]:
        p.add(num)
    assert p.get_product(4) == 9
