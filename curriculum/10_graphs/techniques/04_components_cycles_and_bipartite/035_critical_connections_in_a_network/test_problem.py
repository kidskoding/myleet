from solution import critical_connections


def test_critical_connections_single_bridge():
    result = critical_connections(4, [[0, 1], [1, 2], [2, 0], [1, 3]])
    assert sorted(sorted(edge) for edge in result) == [[1, 3]]


def test_critical_connections_lone_edge():
    result = critical_connections(2, [[0, 1]])
    assert sorted(sorted(edge) for edge in result) == [[0, 1]]
