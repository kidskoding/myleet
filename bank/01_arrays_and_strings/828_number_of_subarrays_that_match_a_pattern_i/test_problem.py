from solution import count_matching_subarrays


def test_count_matching_subarrays_example_increasing():
    assert count_matching_subarrays([1, 2, 3, 4, 5, 6], [1, 1]) == 4


def test_count_matching_subarrays_example_peak_plateau():
    assert count_matching_subarrays([1, 4, 4, 1, 3, 5, 5, 3], [1, 0, -1]) == 2


def test_count_matching_subarrays_all_equal():
    assert count_matching_subarrays([1, 1, 1], [0, 0]) == 1


def test_count_matching_subarrays_no_match():
    assert count_matching_subarrays([3, 2, 1], [1]) == 0


def test_count_matching_subarrays_zigzag():
    assert count_matching_subarrays([1, 2, 1, 2, 1], [1, -1]) == 2
