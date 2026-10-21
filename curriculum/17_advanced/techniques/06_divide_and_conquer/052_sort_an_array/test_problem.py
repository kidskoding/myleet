from solution import sort_array


def test_sort_array_normal():
    assert sort_array([5, 2, 3, 1]) == [1, 2, 3, 5]


def test_sort_array_duplicates():
    assert sort_array([5, 1, 1, 2, 0, 0]) == [0, 0, 1, 1, 2, 5]


def test_sort_array_single():
    assert sort_array([1]) == [1]


def test_sort_array_empty():
    assert sort_array([]) == []


def test_sort_array_already_sorted():
    assert sort_array([1, 2, 3]) == [1, 2, 3]
