from solution import count_good_subarrays


def test_count_good_subarrays_example():
    assert count_good_subarrays([4, 2, 3]) == 4


def test_count_good_subarrays_all_good():
    assert count_good_subarrays([1, 3, 1]) == 6


def test_count_good_subarrays_single_element():
    assert count_good_subarrays([7]) == 1


def test_count_good_subarrays_all_zeros():
    assert count_good_subarrays([0, 0, 0]) == 6


def test_count_good_subarrays_disjoint_bits():
    assert count_good_subarrays([1, 2, 4]) == 3


def test_count_good_subarrays_repeated_dominant_value():
    assert count_good_subarrays([5, 1, 4, 5]) == 9
