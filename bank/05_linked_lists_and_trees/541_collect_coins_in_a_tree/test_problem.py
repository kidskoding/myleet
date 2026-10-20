from solution import collect_the_coins


def test_collect_the_coins_path():
    assert collect_the_coins([1, 0, 0, 0, 0, 1], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]) == 2


def test_collect_the_coins_branching():
    edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [5, 6], [5, 7]]
    assert collect_the_coins([0, 0, 0, 1, 1, 0, 0, 1], edges) == 2


def test_collect_the_coins_no_coins():
    assert collect_the_coins([0, 0, 0], [[0, 1], [1, 2]]) == 0


def test_collect_the_coins_coins_close_together():
    assert collect_the_coins([1, 0, 0, 0, 1], [[0, 1], [1, 2], [2, 3], [3, 4]]) == 0


def test_collect_the_coins_long_path():
    edges = [[i, i + 1] for i in range(8)]
    assert collect_the_coins([1, 0, 0, 0, 0, 0, 0, 0, 1], edges) == 8


def test_collect_the_coins_coinless_branch_is_pruned():
    edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 7], [7, 8]]
    assert collect_the_coins([1, 0, 0, 0, 0, 1, 0, 0, 0], edges) == 2
