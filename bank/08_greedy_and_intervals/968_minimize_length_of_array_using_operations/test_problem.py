from solution import minimum_array_length


def test_minimum_array_length_example_one():
    assert minimum_array_length([1, 4, 3, 1]) == 1


def test_minimum_array_length_example_two():
    assert minimum_array_length([5, 5, 5, 10, 5]) == 2


def test_minimum_array_length_example_three():
    assert minimum_array_length([2, 3, 4]) == 1


def test_minimum_array_length_single():
    assert minimum_array_length([7]) == 1


def test_minimum_array_length_many_minimums():
    assert minimum_array_length([2, 2, 2, 2, 2, 2]) == 3


def test_minimum_array_length_remainder_creates_new_min():
    assert minimum_array_length([4, 6]) == 1
