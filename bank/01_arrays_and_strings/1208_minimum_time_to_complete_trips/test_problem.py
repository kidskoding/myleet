from solution import minimum_time


def test_minimum_time_example_one():
    assert minimum_time([1, 2, 3], 5) == 3


def test_minimum_time_example_two():
    assert minimum_time([2], 1) == 2


def test_minimum_time_large_need():
    assert minimum_time([5, 10, 10], 9) == 25


def test_minimum_time_fast_bus():
    assert minimum_time([1], 100) == 100
