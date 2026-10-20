from solution import num_subarray_product_less_than_k


def test_num_subarray_product_less_than_k_normal():
    assert num_subarray_product_less_than_k([10, 5, 2, 6], 100) == 8


def test_num_subarray_product_less_than_k_zero_k():
    assert num_subarray_product_less_than_k([1, 2, 3], 0) == 0
