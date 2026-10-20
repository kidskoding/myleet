from solution import busiest_servers


def test_busiest_servers_single_busiest():
    assert busiest_servers(3, [1, 2, 3, 4, 5], [5, 2, 3, 3, 3]) == [1]


def test_busiest_servers_first_server():
    assert busiest_servers(3, [1, 2, 3, 4], [1, 2, 1, 2]) == [0]


def test_busiest_servers_all_tied():
    assert busiest_servers(3, [1, 2, 3], [10, 12, 11]) == [0, 1, 2]
