from solution import result_array


def test_result_array_mod_three():
    assert result_array([1, 2, 3, 4, 5], 3) == [9, 2, 4]


def test_result_array_powers_of_two():
    assert result_array([1, 2, 4, 8, 16, 32], 4) == [18, 1, 2, 0]


def test_result_array_mod_two():
    assert result_array([1, 1, 2, 1, 1], 2) == [9, 6]


def test_result_array_k_one_counts_all_subarrays():
    assert result_array([7, 3, 9], 1) == [6]


def test_result_array_single_element():
    assert result_array([4], 5) == [0, 0, 0, 0, 1]


def test_result_array_large_values():
    assert result_array([10**9, 10**9 - 1], 5) == [2, 0, 0, 0, 1]
