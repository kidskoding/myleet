from solution import min_score_triangulation


def test_min_score_triangulation_triangle():
    assert min_score_triangulation([1, 2, 3]) == 6


def test_min_score_triangulation_quad():
    assert min_score_triangulation([3, 7, 4, 5]) == 144


def test_min_score_triangulation_hexagon():
    assert min_score_triangulation([1, 3, 1, 4, 1, 5]) == 13


def test_min_score_triangulation_all_ones():
    assert min_score_triangulation([1, 1, 1, 1]) == 2


def test_min_score_triangulation_equal_values():
    assert min_score_triangulation([2, 2, 2, 2, 2]) == 24
