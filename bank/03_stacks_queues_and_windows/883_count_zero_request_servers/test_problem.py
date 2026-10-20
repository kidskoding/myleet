from solution import count_servers


def test_count_servers_example_one():
    assert count_servers(3, [[1, 3], [2, 6], [1, 5]], 5, [10, 11]) == [1, 2]


def test_count_servers_example_two():
    assert count_servers(3, [[2, 4], [2, 1], [1, 2], [3, 1]], 2, [3, 4]) == [0, 1]


def test_count_servers_window_misses_all_logs():
    assert count_servers(2, [[1, 1]], 1, [5]) == [2]


def test_count_servers_repeated_requests_same_server():
    assert count_servers(2, [[1, 2], [1, 3], [1, 4]], 2, [4, 3]) == [1, 1]


def test_count_servers_unsorted_queries():
    assert count_servers(3, [[1, 1], [2, 5], [3, 10]], 5, [10, 6, 15]) == [1, 1, 2]
