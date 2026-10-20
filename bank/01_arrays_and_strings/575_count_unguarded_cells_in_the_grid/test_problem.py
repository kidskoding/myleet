from solution import count_unguarded


def test_count_unguarded_example_one():
    assert count_unguarded(4, 6, [[0, 0], [1, 1], [2, 3]], [[0, 1], [2, 2], [1, 4]]) == 7


def test_count_unguarded_boxed_in_guard():
    assert count_unguarded(3, 3, [[1, 1]], [[0, 1], [1, 0], [2, 1], [1, 2]]) == 4


def test_count_unguarded_guard_blocks_guard():
    assert count_unguarded(1, 5, [[0, 0], [0, 2]], [[0, 4]]) == 0


def test_count_unguarded_everything_seen():
    assert count_unguarded(2, 2, [[0, 0]], [[1, 1]]) == 0


def test_count_unguarded_walls_block_all_lines():
    assert count_unguarded(3, 3, [[0, 0]], [[0, 1], [1, 0]]) == 6
