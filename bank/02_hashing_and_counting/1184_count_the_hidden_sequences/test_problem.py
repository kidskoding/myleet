from solution import number_of_arrays


def test_number_of_arrays_example_one():
    assert number_of_arrays([1, -3, 4], 1, 6) == 2


def test_number_of_arrays_impossible():
    assert number_of_arrays([3, -4, 5, 1, -2], -4, 5) == 4


def test_number_of_arrays_zero():
    assert number_of_arrays([4, -7, 2], 3, 6) == 0


def test_number_of_arrays_single_diff():
    assert number_of_arrays([1], 1, 3) == 2


def test_number_of_arrays_flat_bounds():
    assert number_of_arrays([0, 0], 5, 5) == 1
