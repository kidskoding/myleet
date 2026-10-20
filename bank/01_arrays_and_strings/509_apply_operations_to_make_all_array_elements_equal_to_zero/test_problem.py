from solution import check_array


def test_check_array_example_true():
    assert check_array([2, 2, 3, 1, 1, 0], 3) is True


def test_check_array_example_false():
    assert check_array([1, 3, 1, 1], 2) is False


def test_check_array_window_of_one_always_works():
    assert check_array([5, 0, 9, 2], 1) is True


def test_check_array_all_zero():
    assert check_array([0, 0, 0], 3) is True


def test_check_array_tail_left_over():
    assert check_array([1, 2], 2) is False


def test_check_array_whole_array_window():
    assert check_array([4, 4, 4], 3) is True
