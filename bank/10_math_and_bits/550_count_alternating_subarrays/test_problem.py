from solution import count_alternating_subarrays


def test_count_alternating_subarrays_repeated_ones():
    assert count_alternating_subarrays([0, 1, 1, 1]) == 5


def test_count_alternating_subarrays_fully_alternating():
    assert count_alternating_subarrays([1, 0, 1, 0]) == 10


def test_count_alternating_subarrays_single():
    assert count_alternating_subarrays([1]) == 1


def test_count_alternating_subarrays_all_same():
    assert count_alternating_subarrays([0, 0, 0]) == 3


def test_count_alternating_subarrays_two_runs():
    assert count_alternating_subarrays([0, 1, 0, 0, 1]) == 9
