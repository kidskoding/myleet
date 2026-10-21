from solution import min_total_time


def test_min_total_time_example_one():
    assert min_total_time([1, 4, 4], [4, 1, 2], [1, 2, 0, 2]) == 12


def test_min_total_time_example_two():
    assert min_total_time([1, 1, 1, 1], [2, 2, 2, 2], [1, 2, 3, 0]) == 4


def test_min_total_time_prefer_backward():
    assert min_total_time([10, 10, 1], [1, 1, 1], [2]) == 1


def test_min_total_time_single_query():
    assert min_total_time([3, 4], [5, 2], [1]) == 3
