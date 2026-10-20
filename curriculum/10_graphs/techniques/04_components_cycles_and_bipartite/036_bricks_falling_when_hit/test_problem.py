from solution import hit_bricks


def test_hit_bricks_one_hit():
    assert hit_bricks([[1, 0, 0, 0], [1, 1, 1, 0]], [[1, 0]]) == [2]


def test_hit_bricks_nothing_falls():
    assert hit_bricks([[1, 0, 0, 0], [1, 1, 0, 0]], [[1, 1], [1, 0]]) == [0, 0]
