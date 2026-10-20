from solution import merge


def test_merge_empty():
    assert merge([]) == []


def test_merge_single_interval():
    assert merge([[1, 3]]) == [[1, 3]]


def test_merge_normal():
    assert merge([[1, 3], [2, 6], [8, 10], [15, 18]]) == [[1, 6], [8, 10], [15, 18]]


def test_merge_touching_intervals():
    assert merge([[1, 4], [4, 5]]) == [[1, 5]]
