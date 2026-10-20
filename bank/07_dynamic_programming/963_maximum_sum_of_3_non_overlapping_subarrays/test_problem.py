from solution import max_sum_of_three_subarrays


def test_max_sum_of_three_subarrays_example_one():
    assert max_sum_of_three_subarrays([1, 2, 1, 2, 6, 7, 5, 1], 2) == [0, 3, 5]


def test_max_sum_of_three_subarrays_ties_pick_smallest():
    assert max_sum_of_three_subarrays([1, 2, 1, 2, 1, 2, 1, 2, 1], 2) == [0, 2, 4]


def test_max_sum_of_three_subarrays_window_of_one():
    assert max_sum_of_three_subarrays([4, 3, 2, 1], 1) == [0, 1, 2]


def test_max_sum_of_three_subarrays_exact_fit():
    assert max_sum_of_three_subarrays([1, 1, 1, 1, 1, 1], 2) == [0, 2, 4]


def test_max_sum_of_three_subarrays_peaks_spread_out():
    assert max_sum_of_three_subarrays([9, 1, 1, 9, 1, 1, 9], 1) == [0, 3, 6]
