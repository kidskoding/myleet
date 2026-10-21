from solution import convert_array


def test_convert_array_example_one():
    assert convert_array([3, 2, 4, 5, 0]) == 4


def test_convert_array_example_two():
    assert convert_array([2, 2, 3, 4]) == 0


def test_convert_array_single():
    assert convert_array([7]) == 0


def test_convert_array_decreasing():
    assert convert_array([5, 4, 3, 2, 1]) == 0
