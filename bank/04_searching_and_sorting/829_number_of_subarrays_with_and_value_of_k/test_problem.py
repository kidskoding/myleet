from solution import count_subarrays


def test_count_subarrays_example_all_ones():
    assert count_subarrays([1, 1, 1], 1) == 6


def test_count_subarrays_example_trailing_two():
    assert count_subarrays([1, 1, 2], 1) == 3


def test_count_subarrays_example_two():
    assert count_subarrays([1, 2, 3], 2) == 2


def test_count_subarrays_zero_single():
    assert count_subarrays([0], 0) == 1


def test_count_subarrays_no_match():
    assert count_subarrays([5], 3) == 0


def test_count_subarrays_bits_turn_off():
    assert count_subarrays([7, 7, 3, 3], 3) == 7
