from solution import find_closest_elements


def test_find_closest_elements_middle_window():
    assert find_closest_elements([1, 2, 3, 4, 5], 4, 3) == [1, 2, 3, 4]


def test_find_closest_elements_left_edge():
    assert find_closest_elements([1, 2, 3, 4, 5], 4, -1) == [1, 2, 3, 4]


def test_find_closest_elements_right_edge():
    assert find_closest_elements([1, 2, 3, 4, 5], 4, 6) == [2, 3, 4, 5]


def test_find_closest_elements_k_equals_length():
    assert find_closest_elements([1, 2, 3], 3, 2) == [1, 2, 3]


def test_find_closest_elements_single_element():
    assert find_closest_elements([1], 1, 5) == [1]
