from solution import largest_rectangle_area


def test_largest_rectangle_area_normal_case():
    assert largest_rectangle_area([2, 1, 5, 6, 2, 3]) == 10


def test_largest_rectangle_area_single_bar():
    assert largest_rectangle_area([4]) == 4


def test_largest_rectangle_area_empty():
    assert largest_rectangle_area([]) == 0


def test_largest_rectangle_area_all_same_height():
    assert largest_rectangle_area([3, 3, 3]) == 9
