from solution import min_time

EDGES = [[0, 1], [0, 2], [1, 4], [1, 5], [2, 3], [2, 6]]


def test_min_time_three_apples():
    assert min_time(7, EDGES, [False, False, True, False, True, True, False]) == 8


def test_min_time_two_apples():
    assert min_time(7, EDGES, [False, False, True, False, False, True, False]) == 6


def test_min_time_no_apples():
    assert min_time(7, EDGES, [False] * 7) == 0


def test_min_time_single_node():
    assert min_time(1, [], [True]) == 0


def test_min_time_edges_listed_child_first():
    assert min_time(4, [[0, 2], [0, 3], [1, 2]], [False, True, False, False]) == 4


def test_min_time_apple_only_at_root():
    assert min_time(3, [[0, 1], [1, 2]], [True, False, False]) == 0
