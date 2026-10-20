from solution import is_rectangle_overlap


def test_is_rectangle_overlap_true():
    assert is_rectangle_overlap([0, 0, 2, 2], [1, 1, 3, 3]) is True


def test_is_rectangle_overlap_false_touching_edge():
    assert is_rectangle_overlap([0, 0, 1, 1], [1, 0, 2, 1]) is False


def test_is_rectangle_overlap_false_disjoint():
    assert is_rectangle_overlap([0, 0, 1, 1], [2, 2, 3, 3]) is False
