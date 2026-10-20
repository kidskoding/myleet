from solution import min_area_rect


def test_min_area_rect_normal():
    points = [[1, 1], [1, 3], [3, 1], [3, 3], [2, 2]]
    assert min_area_rect(points) == 4


def test_min_area_rect_no_rectangle():
    points = [[1, 1], [1, 3], [3, 1]]
    assert min_area_rect(points) == 0


def test_min_area_rect_empty():
    assert min_area_rect([]) == 0
