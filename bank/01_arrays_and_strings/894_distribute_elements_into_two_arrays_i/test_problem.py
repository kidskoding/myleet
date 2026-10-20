from solution import result_array


def test_result_array_example_one():
    assert result_array([2, 1, 3]) == [2, 3, 1]


def test_result_array_example_two():
    assert result_array([5, 4, 3, 8]) == [5, 3, 4, 8]


def test_result_array_increasing():
    assert result_array([1, 2, 3]) == [1, 2, 3]


def test_result_array_switching_targets():
    assert result_array([3, 2, 1, 5, 4]) == [3, 1, 2, 5, 4]


def test_result_array_all_to_first():
    assert result_array([10, 1, 9, 8, 7]) == [10, 9, 8, 7, 1]
