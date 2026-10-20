from solution import SparseVector


def dot(a: list[int], b: list[int]) -> int:
    return SparseVector(a).dot_product(SparseVector(b))


def test_dot_product_basic():
    assert dot([1, 0, 0, 2, 3], [0, 3, 0, 4, 0]) == 8


def test_dot_product_no_overlap():
    assert dot([0, 1, 0, 0, 0], [0, 0, 0, 0, 2]) == 0


def test_dot_product_partial_overlap():
    assert dot([0, 1, 0, 0, 2, 0, 0], [1, 0, 0, 0, 3, 0, 4]) == 6


def test_dot_product_single_negative():
    assert dot([5], [-3]) == -15


def test_dot_product_all_zero():
    assert dot([0, 0, 0], [0, 0, 0]) == 0


def test_dot_product_long_sparse():
    a = [0] * 100_000
    b = [0] * 100_000
    a[3], a[99_999] = 2, 7
    b[99_999], b[50] = 3, 9
    assert dot(a, b) == 21
