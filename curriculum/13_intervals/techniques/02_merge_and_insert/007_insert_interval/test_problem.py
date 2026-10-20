from solution import insert


def test_insert_into_empty():
    assert insert([], [5, 7]) == [[5, 7]]


def test_insert_no_overlap():
    assert insert([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 4]) == [
        [1, 2],
        [3, 5],
        [6, 7],
        [8, 10],
        [12, 16],
    ]


def test_insert_merges_overlap():
    assert insert([[1, 3], [6, 9]], [2, 5]) == [[1, 5], [6, 9]]
