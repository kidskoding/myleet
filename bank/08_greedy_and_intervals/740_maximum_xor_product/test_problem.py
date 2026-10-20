from solution import maximum_xor_product


def test_maximum_xor_product_example_one():
    assert maximum_xor_product(12, 5, 4) == 98


def test_maximum_xor_product_example_two():
    assert maximum_xor_product(6, 7, 5) == 930


def test_maximum_xor_product_example_three():
    assert maximum_xor_product(1, 6, 3) == 12


def test_maximum_xor_product_no_free_bits():
    assert maximum_xor_product(3, 4, 0) == 12


def test_maximum_xor_product_both_zero():
    assert maximum_xor_product(0, 0, 3) == 49
