from solution import max_product_subarray


def test_max_product_subarray_normal():
    assert max_product_subarray([2, 3, -2, 4]) == 6


def test_max_product_subarray_negative_flip():
    assert max_product_subarray([-2, 0, -1]) == 0


def test_max_product_subarray_single_element():
    assert max_product_subarray([-5]) == -5
