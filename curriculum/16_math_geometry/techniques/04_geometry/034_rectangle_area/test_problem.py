from solution import compute_area


def test_compute_area_overlapping():
    assert compute_area(-3, 0, 3, 4, 0, -1, 9, 2) == 45


def test_compute_area_identical_rectangles():
    assert compute_area(-2, -2, 2, 2, -2, -2, 2, 2) == 16
