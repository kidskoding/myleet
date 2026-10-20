from solution import sort_array


def test_sort_array_basic():
    assert sort_array([5, 2, 3, 1]) == [1, 2, 3, 5]


def test_sort_array_duplicates():
    assert sort_array([5, 1, 1, 2, 0, 0]) == [0, 0, 1, 1, 2, 5]


def test_sort_array_single():
    assert sort_array([7]) == [7]


def test_sort_array_negatives():
    assert sort_array([-3, 50000, -50000, 0, -3]) == [-50000, -3, -3, 0, 50000]


def test_sort_array_reversed():
    assert sort_array(list(range(20, 0, -1))) == list(range(1, 21))
