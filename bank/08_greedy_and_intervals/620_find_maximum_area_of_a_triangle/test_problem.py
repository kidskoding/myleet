from solution import max_area


def test_max_area_example():
    assert max_area([[1, 1], [1, 2], [3, 2], [3, 3]]) == 2


def test_max_area_no_axis_parallel_side():
    assert max_area([[1, 1], [2, 2], [3, 3]]) == -1


def test_max_area_single_point():
    assert max_area([[5, 5]]) == -1


def test_max_area_collinear_on_axis_line():
    assert max_area([[1, 1], [5, 1], [3, 1]]) == -1


def test_max_area_vertical_base():
    assert max_area([[1, 1], [1, 5], [4, 3]]) == 12


def test_max_area_large_coordinates():
    assert max_area([[1, 1], [1, 1000000], [1000000, 1]]) == 999998000001
