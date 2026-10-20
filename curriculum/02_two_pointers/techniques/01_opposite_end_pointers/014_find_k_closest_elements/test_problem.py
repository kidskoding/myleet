from solution import find_closest_elements


def test_find_closest_elements_target_inside():
    assert find_closest_elements([1, 2, 3, 4, 5], 4, 3) == [1, 2, 3, 4]


def test_find_closest_elements_target_below_range():
    assert find_closest_elements([1, 2, 3, 4, 5], 4, -1) == [1, 2, 3, 4]


def test_find_closest_elements_with_duplicates():
    assert find_closest_elements([1, 1, 2, 3, 4, 5], 4, -1) == [1, 1, 2, 3]
