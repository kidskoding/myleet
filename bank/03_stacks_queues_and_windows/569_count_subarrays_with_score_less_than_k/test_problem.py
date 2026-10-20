from solution import count_subarrays


def test_count_subarrays_example_one():
    assert count_subarrays([2, 1, 4, 3, 5], 10) == 6


def test_count_subarrays_example_two():
    assert count_subarrays([1, 1, 1], 5) == 5


def test_count_subarrays_score_equal_to_k_excluded():
    assert count_subarrays([5], 5) == 0


def test_count_subarrays_single_under_k():
    assert count_subarrays([5], 6) == 1


def test_count_subarrays_everything_counts():
    assert count_subarrays([1, 1, 1, 1], 100) == 10


def test_count_subarrays_k_one_nothing_counts():
    assert count_subarrays([1, 2, 3], 1) == 0
