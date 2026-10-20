from solution import max_sum_range_query


def test_max_sum_range_query_two_requests():
    assert max_sum_range_query([1, 2, 3, 4, 5], [[1, 3], [0, 1]]) == 19


def test_max_sum_range_query_single_request():
    assert max_sum_range_query([1, 2, 3, 4, 5, 6], [[0, 1]]) == 11


def test_max_sum_range_query_overlapping():
    assert max_sum_range_query([1, 2, 3, 4, 5, 10], [[0, 2], [1, 3], [1, 1]]) == 47


def test_max_sum_range_query_single_index_repeated():
    assert max_sum_range_query([5], [[0, 0], [0, 0]]) == 10


def test_max_sum_range_query_modulo():
    assert max_sum_range_query([100000, 100000], [[0, 1]] * 10000) == 999999993
