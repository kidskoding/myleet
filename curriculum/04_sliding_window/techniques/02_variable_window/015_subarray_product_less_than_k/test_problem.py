from solution import num_subarray_product_less_than_k


def test_num_subarray_product_less_than_k_normal():
    assert num_subarray_product_less_than_k([10, 5, 2, 6], 100) == 8


def test_num_subarray_product_less_than_k_all_qualify():
    assert num_subarray_product_less_than_k([1, 1, 1], 2) == 6


def test_num_subarray_product_less_than_k_none_qualify():
    assert num_subarray_product_less_than_k([10, 20], 5) == 0


def test_num_subarray_product_less_than_k_single_element():
    assert num_subarray_product_less_than_k([5], 10) == 1
