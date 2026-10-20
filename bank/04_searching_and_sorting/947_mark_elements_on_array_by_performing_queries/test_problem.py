from solution import unmarked_sum_array


def test_unmarked_sum_array_three_queries():
    assert unmarked_sum_array([1, 2, 2, 1, 2, 3, 1], [[1, 2], [3, 3], [4, 2]]) == [8, 3, 0]


def test_unmarked_sum_array_one_query():
    assert unmarked_sum_array([1, 4, 2, 3], [[0, 1]]) == [7]


def test_unmarked_sum_array_k_zero():
    assert unmarked_sum_array([5, 1, 3], [[0, 0], [2, 0]]) == [4, 1]


def test_unmarked_sum_array_single_element():
    assert unmarked_sum_array([9], [[0, 0]]) == [0]


def test_unmarked_sum_array_ties_use_smallest_index():
    assert unmarked_sum_array([2, 2, 2, 7], [[3, 1], [3, 1]]) == [4, 2]


def test_unmarked_sum_array_k_exceeds_remaining():
    assert unmarked_sum_array([4, 3, 2, 1], [[0, 3], [1, 3]]) == [0, 0]
