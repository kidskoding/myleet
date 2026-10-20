from solution import min_operations_to_make_median_k


def test_min_operations_to_make_median_k_lower():
    assert min_operations_to_make_median_k([2, 5, 6, 8, 5], 4) == 2


def test_min_operations_to_make_median_k_raise():
    assert min_operations_to_make_median_k([2, 5, 6, 8, 5], 7) == 3


def test_min_operations_to_make_median_k_already():
    assert min_operations_to_make_median_k([1, 2, 3, 4, 5, 6], 4) == 0


def test_min_operations_to_make_median_k_single():
    assert min_operations_to_make_median_k([1], 5) == 4


def test_min_operations_to_make_median_k_even_length_uses_upper_middle():
    assert min_operations_to_make_median_k([1, 2, 3, 4], 2) == 1


def test_min_operations_to_make_median_k_several_values_move():
    assert min_operations_to_make_median_k([9, 9, 9, 1, 1], 5) == 4
