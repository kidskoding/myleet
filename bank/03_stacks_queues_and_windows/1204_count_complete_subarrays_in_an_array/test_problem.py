from solution import count_complete_subarrays


def test_count_complete_subarrays_example_one():
    assert count_complete_subarrays([1, 3, 1, 2, 2]) == 4


def test_count_complete_subarrays_example_two():
    assert count_complete_subarrays([5, 5, 5, 5]) == 10


def test_count_complete_subarrays_all_unique():
    assert count_complete_subarrays([1, 2, 3]) == 1


def test_count_complete_subarrays_two_values():
    assert count_complete_subarrays([1, 2, 1, 2]) == 6


def test_count_complete_subarrays_single():
    assert count_complete_subarrays([7]) == 1
