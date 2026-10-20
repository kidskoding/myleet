from solution import count_arrays


def test_count_arrays_example_one():
    assert count_arrays([25, 1]) == 6


def test_count_arrays_single_position():
    assert count_arrays([1]) == 4


def test_count_arrays_impossible_digit_sum():
    assert count_arrays([2, 49, 23]) == 0


def test_count_arrays_zero_only():
    assert count_arrays([0, 0]) == 1


def test_count_arrays_two_ones():
    assert count_arrays([1, 1]) == 10


def test_count_arrays_decreasing_forced_zero():
    assert count_arrays([1, 0]) == 0
