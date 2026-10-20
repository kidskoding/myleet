from solution import max_width_of_vertical_area


def test_max_width_of_vertical_area_small():
    assert max_width_of_vertical_area([[8, 7], [9, 9], [7, 4], [9, 7]]) == 1


def test_max_width_of_vertical_area_unsorted():
    assert max_width_of_vertical_area([[3, 1], [9, 0], [1, 0], [1, 4], [5, 3], [8, 8]]) == 3


def test_max_width_of_vertical_area_same_x():
    assert max_width_of_vertical_area([[2, 1], [2, 5]]) == 0


def test_max_width_of_vertical_area_two_points():
    assert max_width_of_vertical_area([[0, 0], [10**9, 10**9]]) == 10**9
