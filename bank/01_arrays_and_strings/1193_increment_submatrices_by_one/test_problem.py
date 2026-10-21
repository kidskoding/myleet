from solution import range_add_queries


def test_range_add_queries_example_one():
    assert range_add_queries(3, [[1, 1, 2, 2], [0, 0, 1, 1]]) == [
        [1, 1, 0],
        [1, 2, 1],
        [0, 1, 1],
    ]


def test_range_add_queries_full():
    assert range_add_queries(2, [[0, 0, 1, 1]]) == [[1, 1], [1, 1]]


def test_range_add_queries_single_cell():
    assert range_add_queries(2, [[0, 1, 0, 1]]) == [[0, 1], [0, 0]]
