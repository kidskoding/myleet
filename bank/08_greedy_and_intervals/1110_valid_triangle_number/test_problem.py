from solution import triangle_number


def test_triangle_number_with_duplicates():
    assert triangle_number([2, 2, 3, 4]) == 3


def test_triangle_number_unsorted():
    assert triangle_number([4, 2, 3, 4]) == 4


def test_triangle_number_too_short():
    assert triangle_number([1]) == 0


def test_triangle_number_zeros_never_count():
    assert triangle_number([0, 0, 0]) == 0
    assert triangle_number([0, 1, 1, 1]) == 1


def test_triangle_number_degenerate_excluded():
    assert triangle_number([1, 2, 3]) == 0


def test_triangle_number_all_equal():
    assert triangle_number([5, 5, 5, 5]) == 4
