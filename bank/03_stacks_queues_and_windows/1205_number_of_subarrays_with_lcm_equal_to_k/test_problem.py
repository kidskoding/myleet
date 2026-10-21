from solution import subarray_lcm


def test_subarray_lcm_example_one():
    assert subarray_lcm([3, 6, 2, 7, 1], 6) == 4


def test_subarray_lcm_example_two():
    assert subarray_lcm([3], 2) == 0


def test_subarray_lcm_all_match():
    assert subarray_lcm([1, 1, 1], 1) == 6


def test_subarray_lcm_single_equal():
    assert subarray_lcm([5], 5) == 1
