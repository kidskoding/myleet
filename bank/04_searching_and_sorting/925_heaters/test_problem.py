from solution import find_radius


def test_find_radius_one_heater_in_middle():
    assert find_radius([1, 2, 3], [2]) == 1


def test_find_radius_heaters_at_ends():
    assert find_radius([1, 2, 3, 4], [1, 4]) == 1


def test_find_radius_house_far_right():
    assert find_radius([1, 5], [2]) == 3


def test_find_radius_houses_on_heaters():
    assert find_radius([3, 7], [7, 3]) == 0


def test_find_radius_unsorted_input():
    assert find_radius([1, 5, 3], [4, 1]) == 1


def test_find_radius_large_coordinates():
    assert find_radius([1, 10**9], [1]) == 10**9 - 1
