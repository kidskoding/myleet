from solution import process_queries


def test_process_queries_example_chain():
    connections = [[1, 2], [2, 3], [3, 4], [4, 5]]
    queries = [[1, 3], [2, 1], [1, 1], [2, 2], [1, 2]]
    assert process_queries(5, connections, queries) == [3, 2, 3]


def test_process_queries_example_isolated():
    assert process_queries(3, [], [[1, 1], [2, 1], [1, 1]]) == [1, -1]


def test_process_queries_two_grids():
    queries = [[2, 1], [1, 2], [2, 2], [1, 1], [1, 3], [2, 3], [1, 3]]
    assert process_queries(4, [[1, 2], [3, 4]], queries) == [2, -1, 3, 4]


def test_process_queries_repeat_offline():
    queries = [[2, 2], [2, 2], [1, 2], [2, 1], [1, 2]]
    assert process_queries(3, [[1, 2], [2, 3]], queries) == [1, 3]


def test_process_queries_only_checks():
    assert process_queries(2, [[1, 2]], [[1, 2], [1, 1]]) == [2, 1]
