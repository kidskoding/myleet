from solution import split_array


def test_split_array_example_true():
    assert split_array([1, 2, 1, 2, 1, 2, 1]) is True


def test_split_array_example_false():
    assert split_array([1, 2, 1, 2, 1, 2, 1, 2]) is False


def test_split_array_too_short():
    assert split_array([1, 2, 3, 4]) is False


def test_split_array_all_zeros():
    assert split_array([0, 0, 0, 0, 0, 0, 0]) is True
