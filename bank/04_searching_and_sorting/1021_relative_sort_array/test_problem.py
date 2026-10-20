from solution import relative_sort_array


def test_relative_sort_array_example_one():
    arr1 = [2, 3, 1, 3, 2, 4, 6, 7, 9, 2, 19]
    arr2 = [2, 1, 4, 3, 9, 6]
    assert relative_sort_array(arr1, arr2) == [2, 2, 2, 1, 4, 3, 3, 9, 6, 7, 19]


def test_relative_sort_array_example_two():
    assert relative_sort_array([28, 6, 22, 8, 44, 17], [22, 28, 8, 6]) == [22, 28, 8, 6, 17, 44]


def test_relative_sort_array_all_in_arr2():
    assert relative_sort_array([3, 1, 2, 1], [2, 1, 3]) == [2, 1, 1, 3]


def test_relative_sort_array_none_in_arr2_besides_one():
    assert relative_sort_array([5, 3, 9, 1], [9]) == [9, 1, 3, 5]


def test_relative_sort_array_single():
    assert relative_sort_array([4], [4]) == [4]
