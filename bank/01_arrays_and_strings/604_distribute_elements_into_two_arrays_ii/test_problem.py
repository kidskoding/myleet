from solution import result_array


def test_result_array_example_one():
    assert result_array([2, 1, 3, 3]) == [2, 3, 1, 3]


def test_result_array_example_two():
    assert result_array([5, 14, 3, 1, 2]) == [5, 3, 1, 2, 14]


def test_result_array_all_equal():
    assert result_array([3, 3, 3, 3]) == [3, 3, 3, 3]


def test_result_array_mixed():
    assert result_array([3, 1, 2, 4, 1, 5]) == [3, 2, 1, 1, 4, 5]


def test_result_array_alternating():
    assert result_array([1, 10, 2, 9, 3, 8]) == [1, 10, 2, 9, 3, 8]


def test_result_array_minimum_length():
    assert result_array([1, 2, 3]) == [1, 3, 2]
