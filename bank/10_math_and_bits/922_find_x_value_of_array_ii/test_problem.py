from solution import result_array


def test_result_array_updates_and_starts():
    assert result_array([1, 2, 3, 4, 5], 3, [[2, 2, 0, 2], [3, 3, 3, 0], [0, 1, 0, 1]]) == [2, 2, 2]


def test_result_array_powers_of_two():
    assert result_array([1, 2, 4, 8, 16, 32], 4, [[0, 2, 0, 2], [0, 2, 0, 1]]) == [1, 0]


def test_result_array_mod_two():
    assert result_array([1, 1, 2, 1, 1], 2, [[2, 1, 0, 1]]) == [5]


def test_result_array_single_element():
    assert result_array([3], 2, [[0, 4, 0, 0], [0, 5, 0, 1]]) == [1, 1]


def test_result_array_k_one():
    assert result_array([5, 6, 7, 8], 1, [[1, 9, 1, 0], [3, 2, 0, 0]]) == [3, 4]


def test_result_array_start_at_last_index():
    assert result_array([2, 3, 4], 5, [[1, 1, 2, 4], [2, 3, 2, 4]]) == [1, 0]
