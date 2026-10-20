from solution import kth_smallest


def test_kth_smallest_normal():
    assert kth_smallest([[1, 5, 9], [10, 11, 13], [12, 13, 15]], 8) == 13


def test_kth_smallest_single_cell():
    assert kth_smallest([[-5]], 1) == -5
