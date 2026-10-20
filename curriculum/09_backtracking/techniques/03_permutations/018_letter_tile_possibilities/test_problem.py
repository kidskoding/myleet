from solution import num_tile_possibilities


def test_num_tile_possibilities_with_repeat():
    assert num_tile_possibilities("AAB") == 8


def test_num_tile_possibilities_longer():
    assert num_tile_possibilities("AAABBC") == 188


def test_num_tile_possibilities_single_tile():
    assert num_tile_possibilities("V") == 1
